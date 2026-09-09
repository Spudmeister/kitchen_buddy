/// Migration `v3-health` (M11, ADR-009): serving reports and food overrides
/// are append-only personal annotations; `recipe_health` is a derived,
/// rewritable projection of per-serving figures refreshed inside every
/// write and rebuilt when the food table or thresholds change.
///
/// Requirements: kitchen-buddy-ios 20.1, 20.4, 21.9, 21.10
enum SchemaV3 {
    static let sql = """
    CREATE TABLE serving_reports (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id),
        servings INTEGER CHECK (servings IS NULL OR (servings >= 1 AND servings <= 999)),
        note TEXT,
        reported_at TEXT NOT NULL
    );
    CREATE INDEX serving_reports_recipe ON serving_reports(recipe_id, reported_at);
    CREATE TRIGGER guard_serving_reports_delete BEFORE DELETE ON serving_reports
        BEGIN SELECT RAISE(ABORT, 'serving reports are never deleted'); END;
    CREATE TRIGGER guard_serving_reports_update BEFORE UPDATE ON serving_reports
        BEGIN SELECT RAISE(ABORT, 'serving reports are immutable'); END;

    CREATE TABLE food_overrides (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id),
        ingredient_key TEXT NOT NULL,
        food_id TEXT,
        created_at TEXT NOT NULL
    );
    CREATE INDEX food_overrides_recipe ON food_overrides(recipe_id, created_at);
    CREATE TRIGGER guard_food_overrides_delete BEFORE DELETE ON food_overrides
        BEGIN SELECT RAISE(ABORT, 'food overrides are never deleted'); END;
    CREATE TRIGGER guard_food_overrides_update BEFORE UPDATE ON food_overrides
        BEGIN SELECT RAISE(ABORT, 'food overrides are immutable'); END;

    CREATE TABLE recipe_health (
        recipe_id TEXT PRIMARY KEY NOT NULL REFERENCES recipes(id),
        index_version TEXT NOT NULL,
        effective_servings INTEGER,
        coverage REAL NOT NULL,
        carbs_g REAL,
        available_carbs_g REAL,
        glycemic_load REAL,
        sodium_mg REAL,
        saturated_fat_g REAL,
        diabetes_band INTEGER,
        sodium_band INTEGER,
        sat_fat_band INTEGER,
        computed_at TEXT NOT NULL
    ) WITHOUT ROWID;
    CREATE INDEX recipe_health_bands ON recipe_health(diabetes_band, sodium_band, sat_fat_band);
    """
}
