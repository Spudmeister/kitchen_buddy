import Foundation
import KitchenCore

/// The recipe book's write and read API. View models depend on this, never
/// on the concrete store or on GRDB. Every write is one transaction that
/// also refreshes the search projection; nothing here ever deletes a row.
///
/// Requirements: kitchen-buddy-ios 1.6, 2.1–2.5, 3.1–3.5, 4.1–4.4, 6.1–6.3, 7.1–7.5, 15.1–15.4, 16.1
public protocol RecipeStoring: Sendable {
    // Create and edit
    func create(_ draft: RecipeDraft) throws -> RecipeDetail
    /// Saves the draft over the recipe: a new version only when versioned
    /// content changed; tags and folder applied without versioning.
    func save(_ draft: RecipeDraft, for id: Recipe.ID) throws -> RecipeDetail
    func duplicate(_ id: Recipe.ID) throws -> RecipeDetail

    // Read
    func detail(_ id: Recipe.ID) throws -> RecipeDetail?
    func detail(_ id: Recipe.ID, version: Int) throws -> RecipeDetail?
    /// Newest first.
    func versions(_ id: Recipe.ID) throws -> [RecipeVersion]
    func heritage(_ id: Recipe.ID) throws -> RecipeHeritage?
    func summaries(_ query: RecipeQuery) throws -> [RecipeSummary]
    func observeSummaries(_ query: RecipeQuery) -> AsyncThrowingStream<[RecipeSummary], Error>
    func count(includeArchived: Bool) throws -> Int

    // Versions
    func restore(_ id: Recipe.ID, toVersion version: Int) throws -> RecipeDetail

    // Archive
    func archive(_ id: Recipe.ID) throws
    func unarchive(_ id: Recipe.ID) throws

    // Placement
    func move(_ id: Recipe.ID, toFolder folderID: Folder.ID?) throws
    func setTags(_ tags: [String], for id: Recipe.ID) throws

    // Ratings
    @discardableResult func rate(_ id: Recipe.ID, value: Int) throws -> Rating
    /// Appends a clear event: the recipe reads as unrated until rated again.
    func clearRating(_ id: Recipe.ID) throws
    /// Chronological star ratings only.
    func ratings(_ id: Recipe.ID) throws -> [Rating]
    /// Chronological ratings and clears.
    func ratingEvents(_ id: Recipe.ID) throws -> [RatingEvent]

    // Notes
    @discardableResult func addNote(to id: Recipe.ID, body: String, cookedOn: Date?) throws -> RecipeNote
    @discardableResult func updateNote(_ noteID: RecipeNote.ID, body: String, cookedOn: Date?) throws -> RecipeNote
    @discardableResult func setNotePinned(_ noteID: RecipeNote.ID, _ pinned: Bool) throws -> RecipeNote
    func deleteNote(_ noteID: RecipeNote.ID) throws
    func undeleteNote(_ noteID: RecipeNote.ID) throws
    /// Pinned first, then newest first.
    func notes(_ id: Recipe.ID, includeDeleted: Bool) throws -> [RecipeNote]
}
