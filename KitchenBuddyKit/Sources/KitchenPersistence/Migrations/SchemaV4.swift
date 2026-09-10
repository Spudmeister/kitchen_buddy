/// Migration `v4-food-mappings` (M10.8, ADR-009 amendment): book-wide
/// corrections of the food table's matching, append-only like overrides.
///
/// Requirements: kitchen-buddy-ios 21.11
enum SchemaV4 {
    static let sql = """
    CREATE TABLE food_mappings (
        id TEXT PRIMARY KEY NOT NULL,
        ingredient_key TEXT NOT NULL,
        food_id TEXT,
        created_at TEXT NOT NULL
    );
    CREATE INDEX food_mappings_key ON food_mappings(ingredient_key, created_at);
    CREATE TRIGGER guard_food_mappings_delete BEFORE DELETE ON food_mappings
        BEGIN SELECT RAISE(ABORT, 'food mappings are never deleted'); END;
    CREATE TRIGGER guard_food_mappings_update BEFORE UPDATE ON food_mappings
        BEGIN SELECT RAISE(ABORT, 'food mappings are immutable'); END;
    """
}
