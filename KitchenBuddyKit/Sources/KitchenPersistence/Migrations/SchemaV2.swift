/// Migration `v2-rating-clears`: clearing a rating is an appended event, so
/// the rating history stays immutable (Requirement 15.3) and a recipe can
/// still go back to "unrated". The current rating is the latest event across
/// `ratings` and `rating_clears`.
///
/// Requirements: kitchen-buddy-ios 15.1–15.3
enum SchemaV2 {
    static let sql = """
    CREATE TABLE rating_clears (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id),
        cleared_at TEXT NOT NULL
    );
    CREATE INDEX rating_clears_recipe ON rating_clears(recipe_id, cleared_at);
    CREATE TRIGGER guard_rating_clears_delete BEFORE DELETE ON rating_clears
        BEGIN SELECT RAISE(ABORT, 'rating clears are never deleted'); END;
    CREATE TRIGGER guard_rating_clears_update BEFORE UPDATE ON rating_clears
        BEGIN SELECT RAISE(ABORT, 'rating clears are immutable'); END;
    """
}
