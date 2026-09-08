/// Migration `v1-initial`: the recipe-book schema (design.md "Schema").
///
/// - Every user-content table is guarded by `BEFORE DELETE` → `RAISE(ABORT)`
///   triggers; versions, ingredients, instructions, and ratings are also
///   guarded against `UPDATE` (ADR-003).
/// - `recipe_search` is the denormalized browse/sort projection. It has an
///   explicit `rowid INTEGER PRIMARY KEY` because `recipes_fts` refers to its
///   rows by rowid and `VACUUM INTO` (snapshots) may renumber implicit
///   rowids — an explicit integer key is stable.
/// - `recipes_fts` is an external-content FTS5 index over `recipe_search`,
///   kept in sync by the AI/AD/AU triggers.
///
/// Requirements: kitchen-buddy-ios 1.6, 3.5, 6.1, 17.1, 17.8
enum SchemaV1 {
    static let sql = """
    CREATE TABLE folders (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        parent_id TEXT REFERENCES folders(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        CHECK (parent_id IS NULL OR parent_id <> id)
    );
    CREATE INDEX folders_parent ON folders(parent_id);

    CREATE TABLE recipes (
        id TEXT PRIMARY KEY NOT NULL,
        current_version INTEGER NOT NULL DEFAULT 1,
        folder_id TEXT REFERENCES folders(id),
        parent_recipe_id TEXT REFERENCES recipes(id),
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (parent_recipe_id IS NULL OR parent_recipe_id <> id)
    );
    CREATE INDEX recipes_folder ON recipes(folder_id);
    CREATE INDEX recipes_parent ON recipes(parent_recipe_id);
    CREATE INDEX recipes_archived ON recipes(archived_at);

    CREATE TABLE recipe_versions (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id),
        version INTEGER NOT NULL CHECK (version >= 1),
        title TEXT NOT NULL,
        description TEXT,
        prep_minutes INTEGER,
        cook_minutes INTEGER,
        servings INTEGER,
        source_url TEXT,
        restored_from_version INTEGER,
        created_at TEXT NOT NULL,
        UNIQUE (recipe_id, version)
    );

    CREATE TABLE ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_version_id TEXT NOT NULL REFERENCES recipe_versions(id),
        sort_order INTEGER NOT NULL,
        name TEXT NOT NULL,
        quantity_num INTEGER,
        quantity_den INTEGER,
        quantity_value REAL GENERATED ALWAYS AS (CAST(quantity_num AS REAL) / quantity_den) VIRTUAL,
        unit TEXT,
        notes TEXT,
        category TEXT,
        UNIQUE (recipe_version_id, sort_order),
        CHECK ((quantity_num IS NULL) = (quantity_den IS NULL)),
        CHECK (quantity_den IS NULL OR quantity_den > 0)
    );

    CREATE TABLE instructions (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_version_id TEXT NOT NULL REFERENCES recipe_versions(id),
        step_number INTEGER NOT NULL CHECK (step_number >= 1),
        text TEXT NOT NULL,
        duration_minutes INTEGER,
        notes TEXT,
        UNIQUE (recipe_version_id, step_number)
    );

    CREATE TABLE tags (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        created_at TEXT NOT NULL
    );

    CREATE TABLE recipe_tags (
        recipe_id TEXT NOT NULL REFERENCES recipes(id),
        tag_id TEXT NOT NULL REFERENCES tags(id),
        PRIMARY KEY (recipe_id, tag_id)
    ) WITHOUT ROWID;
    CREATE INDEX recipe_tags_tag ON recipe_tags(tag_id);

    CREATE TABLE photos (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id),
        file_name TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        taken_at TEXT,
        caption TEXT,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        removed_at TEXT
    );
    CREATE INDEX photos_recipe ON photos(recipe_id, sort_order);

    CREATE TABLE ratings (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id),
        value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
        rated_at TEXT NOT NULL
    );
    CREATE INDEX ratings_recipe ON ratings(recipe_id, rated_at);

    CREATE TABLE recipe_notes (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id),
        body TEXT NOT NULL,
        cooked_on TEXT,
        pinned INTEGER NOT NULL DEFAULT 0,
        version_at_creation INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
    );
    CREATE INDEX recipe_notes_recipe ON recipe_notes(recipe_id);

    CREATE TABLE preferences (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
    ) WITHOUT ROWID;

    CREATE TABLE recipe_search (
        rowid INTEGER PRIMARY KEY,
        recipe_id TEXT NOT NULL UNIQUE REFERENCES recipes(id),
        title TEXT NOT NULL,
        title_sort TEXT NOT NULL,
        description TEXT,
        ingredients_text TEXT NOT NULL DEFAULT '',
        instructions_text TEXT NOT NULL DEFAULT '',
        tags_text TEXT NOT NULL DEFAULT '',
        folder_id TEXT,
        archived_at TEXT,
        latest_rating INTEGER,
        total_minutes INTEGER,
        thumbnail_photo_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    CREATE INDEX recipe_search_browse ON recipe_search(archived_at, title_sort);
    CREATE INDEX recipe_search_folder ON recipe_search(folder_id);
    CREATE INDEX recipe_search_updated ON recipe_search(updated_at);

    CREATE VIRTUAL TABLE recipes_fts USING fts5(
        title, description, ingredients_text, instructions_text, tags_text,
        content='recipe_search', content_rowid='rowid',
        tokenize='unicode61 remove_diacritics 2', prefix='2 3'
    );

    CREATE TRIGGER recipe_search_ai AFTER INSERT ON recipe_search BEGIN
        INSERT INTO recipes_fts(rowid, title, description, ingredients_text, instructions_text, tags_text)
        VALUES (new.rowid, new.title, new.description, new.ingredients_text, new.instructions_text, new.tags_text);
    END;
    CREATE TRIGGER recipe_search_ad AFTER DELETE ON recipe_search BEGIN
        INSERT INTO recipes_fts(recipes_fts, rowid, title, description, ingredients_text, instructions_text, tags_text)
        VALUES ('delete', old.rowid, old.title, old.description, old.ingredients_text, old.instructions_text, old.tags_text);
    END;
    CREATE TRIGGER recipe_search_au AFTER UPDATE ON recipe_search BEGIN
        INSERT INTO recipes_fts(recipes_fts, rowid, title, description, ingredients_text, instructions_text, tags_text)
        VALUES ('delete', old.rowid, old.title, old.description, old.ingredients_text, old.instructions_text, old.tags_text);
        INSERT INTO recipes_fts(rowid, title, description, ingredients_text, instructions_text, tags_text)
        VALUES (new.rowid, new.title, new.description, new.ingredients_text, new.instructions_text, new.tags_text);
    END;

    CREATE TRIGGER guard_recipes_delete BEFORE DELETE ON recipes
        BEGIN SELECT RAISE(ABORT, 'recipes are never deleted; archive instead'); END;
    CREATE TRIGGER guard_recipe_versions_delete BEFORE DELETE ON recipe_versions
        BEGIN SELECT RAISE(ABORT, 'recipe versions are never deleted'); END;
    CREATE TRIGGER guard_ingredients_delete BEFORE DELETE ON ingredients
        BEGIN SELECT RAISE(ABORT, 'ingredients are never deleted'); END;
    CREATE TRIGGER guard_instructions_delete BEFORE DELETE ON instructions
        BEGIN SELECT RAISE(ABORT, 'instructions are never deleted'); END;
    CREATE TRIGGER guard_recipe_notes_delete BEFORE DELETE ON recipe_notes
        BEGIN SELECT RAISE(ABORT, 'notes are never deleted; set deleted_at'); END;
    CREATE TRIGGER guard_photos_delete BEFORE DELETE ON photos
        BEGIN SELECT RAISE(ABORT, 'photos are never deleted; set removed_at'); END;
    CREATE TRIGGER guard_ratings_delete BEFORE DELETE ON ratings
        BEGIN SELECT RAISE(ABORT, 'ratings are never deleted'); END;
    CREATE TRIGGER guard_folders_delete BEFORE DELETE ON folders
        BEGIN SELECT RAISE(ABORT, 'folders are never deleted; set deleted_at'); END;
    CREATE TRIGGER guard_tags_delete BEFORE DELETE ON tags
        BEGIN SELECT RAISE(ABORT, 'tags are never deleted'); END;

    CREATE TRIGGER guard_recipe_versions_update BEFORE UPDATE ON recipe_versions
        BEGIN SELECT RAISE(ABORT, 'recipe versions are immutable'); END;
    CREATE TRIGGER guard_ingredients_update BEFORE UPDATE ON ingredients
        BEGIN SELECT RAISE(ABORT, 'ingredients are immutable'); END;
    CREATE TRIGGER guard_instructions_update BEFORE UPDATE ON instructions
        BEGIN SELECT RAISE(ABORT, 'instructions are immutable'); END;
    CREATE TRIGGER guard_ratings_update BEFORE UPDATE ON ratings
        BEGIN SELECT RAISE(ABORT, 'ratings are immutable'); END;
    CREATE TRIGGER guard_recipes_parent_immutable BEFORE UPDATE OF parent_recipe_id ON recipes
        WHEN old.parent_recipe_id IS NOT new.parent_recipe_id
        BEGIN SELECT RAISE(ABORT, 'a recipe''s parent is set only at creation'); END;
    """
}
