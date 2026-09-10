import Foundation

/// The `.kbrecipes` file, format v2 (ADR-006): everything a recipe book
/// holds — folders, recipes with all versions, tags, rating history, notes,
/// lineage, archive state, and optionally embedded photos. Quantities are
/// written twice (`quantity` double for other tools, `quantityFraction`
/// exact); readers prefer the fraction. Dates are ISO-8601.
///
/// **2.1 (M11):** recipes also carry `servingReports[]` and `foodOverrides[]`;
/// both are optional on read so 2.0 files decode unchanged, and 2.0 readers
/// ignore them.
///
/// Requirements: kitchen-buddy-ios 13.4, 14.1, 20.4, 21.10
public struct ExportDocumentV2: Codable, Hashable, Sendable {
    public static let formatName = "kitchenbuddy-export"
    public static let currentVersion = "2.1"

    public var format: String = ExportDocumentV2.formatName
    public var version: String = ExportDocumentV2.currentVersion
    public var exportedAt: Date
    public var appBuild: String
    public var folders: [FolderRecord]
    public var recipes: [RecipeRecord]

    public init(exportedAt: Date, appBuild: String, folders: [FolderRecord], recipes: [RecipeRecord]) {
        self.exportedAt = exportedAt
        self.appBuild = appBuild
        self.folders = folders
        self.recipes = recipes
    }

    public struct FolderRecord: Codable, Hashable, Sendable {
        public var id: Folder.ID
        public var name: String
        public var parentId: Folder.ID?
        public var createdAt: Date
        public var updatedAt: Date
        public var deletedAt: Date?

        public init(_ folder: Folder) {
            id = folder.id; name = folder.name; parentId = folder.parentID
            createdAt = folder.createdAt; updatedAt = folder.updatedAt; deletedAt = folder.deletedAt
        }
    }

    public struct RecipeRecord: Codable, Hashable, Sendable {
        public var id: Recipe.ID
        public var currentVersion: Int
        public var folderId: Folder.ID?
        public var parentRecipeId: Recipe.ID?
        public var archivedAt: Date?
        public var createdAt: Date
        public var updatedAt: Date
        public var tags: [String]
        public var versions: [VersionRecord]
        public var ratings: [RatingRecord]
        public var ratingClears: [ClearRecord]
        public var notes: [NoteRecord]
        public var photos: [PhotoRecord]
        /// 2.1: "servings you get" history, oldest first.
        public var servingReports: [ServingReportRecord]
        /// 2.1: worksheet corrections, oldest first.
        public var foodOverrides: [FoodOverrideRecord]

        public init(id: Recipe.ID, currentVersion: Int, folderId: Folder.ID?, parentRecipeId: Recipe.ID?, archivedAt: Date?,
                    createdAt: Date, updatedAt: Date, tags: [String], versions: [VersionRecord], ratings: [RatingRecord],
                    ratingClears: [ClearRecord], notes: [NoteRecord], photos: [PhotoRecord],
                    servingReports: [ServingReportRecord] = [], foodOverrides: [FoodOverrideRecord] = []) {
            self.id = id; self.currentVersion = currentVersion; self.folderId = folderId; self.parentRecipeId = parentRecipeId
            self.archivedAt = archivedAt; self.createdAt = createdAt; self.updatedAt = updatedAt; self.tags = tags
            self.versions = versions; self.ratings = ratings; self.ratingClears = ratingClears; self.notes = notes; self.photos = photos
            self.servingReports = servingReports; self.foodOverrides = foodOverrides
        }

        enum CodingKeys: String, CodingKey {
            case id, currentVersion, folderId, parentRecipeId, archivedAt, createdAt, updatedAt, tags, versions, ratings,
                 ratingClears, notes, photos, servingReports, foodOverrides
        }

        /// 2.0 files have no `servingReports` / `foodOverrides` keys.
        public init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(Recipe.ID.self, forKey: .id)
            currentVersion = try c.decode(Int.self, forKey: .currentVersion)
            folderId = try c.decodeIfPresent(Folder.ID.self, forKey: .folderId)
            parentRecipeId = try c.decodeIfPresent(Recipe.ID.self, forKey: .parentRecipeId)
            archivedAt = try c.decodeIfPresent(Date.self, forKey: .archivedAt)
            createdAt = try c.decode(Date.self, forKey: .createdAt)
            updatedAt = try c.decode(Date.self, forKey: .updatedAt)
            tags = try c.decode([String].self, forKey: .tags)
            versions = try c.decode([VersionRecord].self, forKey: .versions)
            ratings = try c.decode([RatingRecord].self, forKey: .ratings)
            ratingClears = try c.decode([ClearRecord].self, forKey: .ratingClears)
            notes = try c.decode([NoteRecord].self, forKey: .notes)
            photos = try c.decode([PhotoRecord].self, forKey: .photos)
            servingReports = try c.decodeIfPresent([ServingReportRecord].self, forKey: .servingReports) ?? []
            foodOverrides = try c.decodeIfPresent([FoodOverrideRecord].self, forKey: .foodOverrides) ?? []
        }
    }

    public struct ServingReportRecord: Codable, Hashable, Sendable {
        public var id: ServingReport.ID
        public var servings: Int?
        public var note: String?
        public var reportedAt: Date
        public init(_ report: ServingReport) {
            id = report.id; servings = report.servings; note = report.note; reportedAt = report.reportedAt
        }
    }

    public struct FoodOverrideRecord: Codable, Hashable, Sendable {
        public var id: FoodOverride.ID
        public var ingredientKey: String
        /// nil = don't count; "" = back to automatic (the stored marker).
        public var foodId: Food.ID?
        public var createdAt: Date
        public init(_ override: FoodOverride) {
            id = override.id; ingredientKey = override.ingredientKey; foodId = override.foodID; createdAt = override.createdAt
        }
    }

    public struct VersionRecord: Codable, Hashable, Sendable {
        public var id: RecipeVersion.ID
        public var version: Int
        public var title: String
        public var description: String?
        public var ingredients: [IngredientRecord]
        public var instructions: [InstructionRecord]
        public var prepMinutes: Int?
        public var cookMinutes: Int?
        public var servings: Int?
        public var sourceUrl: String?
        public var restoredFromVersion: Int?
        public var createdAt: Date

        public init(_ version: RecipeVersion) {
            id = version.id; self.version = version.version; title = version.title; description = version.description
            ingredients = version.ingredients.map(IngredientRecord.init)
            instructions = version.instructions.map(InstructionRecord.init)
            prepMinutes = version.prepMinutes; cookMinutes = version.cookMinutes; servings = version.servings
            sourceUrl = version.sourceURL?.absoluteString; restoredFromVersion = version.restoredFromVersion; createdAt = version.createdAt
        }

        public var content: RecipeContent {
            RecipeContent(title: title, description: description,
                          ingredients: ingredients.map(\.draft), instructions: instructions.map(\.draft),
                          prepMinutes: prepMinutes, cookMinutes: cookMinutes, servings: servings,
                          sourceURL: sourceUrl.flatMap(URL.init(string:)))
        }
    }

    public struct IngredientRecord: Codable, Hashable, Sendable {
        public var id: Ingredient.ID
        public var name: String
        public var quantity: Double?
        public var quantityFraction: String?
        public var unit: String?
        public var notes: String?
        public var category: String?

        public init(_ ingredient: Ingredient) {
            id = ingredient.id; name = ingredient.name
            quantity = ingredient.quantity?.doubleValue; quantityFraction = ingredient.quantity?.description
            unit = ingredient.unit?.rawValue; notes = ingredient.notes; category = ingredient.category?.rawValue
        }

        public var draft: IngredientDraft {
            let fraction = quantityFraction.flatMap(Fraction.init(parsing:)) ?? quantity.flatMap { Fraction(approximating: $0, maxDenominator: 64) }
            return IngredientDraft(name: name, quantity: fraction, unit: unit.flatMap(IngredientUnit.init(rawValue:)),
                                   notes: notes, category: category.flatMap(IngredientCategory.init(rawValue:)))
        }
    }

    public struct InstructionRecord: Codable, Hashable, Sendable {
        public var id: Instruction.ID
        public var step: Int
        public var text: String
        public var durationMinutes: Int?
        public var notes: String?

        public init(_ instruction: Instruction) {
            id = instruction.id; step = instruction.step; text = instruction.text
            durationMinutes = instruction.durationMinutes; notes = instruction.notes
        }

        public var draft: InstructionDraft { InstructionDraft(text: text, durationMinutes: durationMinutes, notes: notes) }
    }

    public struct RatingRecord: Codable, Hashable, Sendable {
        public var id: Rating.ID
        public var value: Int
        public var ratedAt: Date
        public init(_ rating: Rating) { id = rating.id; value = rating.value; ratedAt = rating.ratedAt }
    }

    public struct ClearRecord: Codable, Hashable, Sendable {
        public var id: String
        public var clearedAt: Date
        public init(id: String, clearedAt: Date) { self.id = id; self.clearedAt = clearedAt }
    }

    public struct NoteRecord: Codable, Hashable, Sendable {
        public var id: RecipeNote.ID
        public var body: String
        public var cookedOn: Date?
        public var pinned: Bool
        public var versionAtCreation: Int
        public var createdAt: Date
        public var updatedAt: Date
        public var deletedAt: Date?

        public init(_ note: RecipeNote) {
            id = note.id; body = note.body; cookedOn = note.cookedOn; pinned = note.pinned
            versionAtCreation = note.versionAtCreation; createdAt = note.createdAt; updatedAt = note.updatedAt; deletedAt = note.deletedAt
        }
    }

    public struct PhotoRecord: Codable, Hashable, Sendable {
        public var id: Photo.ID
        public var fileName: String
        public var width: Int
        public var height: Int
        public var takenAt: Date?
        public var caption: String?
        public var sortOrder: Int
        public var createdAt: Date
        public var removedAt: Date?
        /// JPEG bytes when photos are embedded; base64 in the file.
        public var data: Data?

        public init(_ photo: Photo, data: Data?) {
            id = photo.id; fileName = photo.fileName; width = photo.width; height = photo.height; takenAt = photo.takenAt
            caption = photo.caption; sortOrder = photo.sortOrder; createdAt = photo.createdAt; removedAt = photo.removedAt
            self.data = data
        }
    }

    // MARK: Coding

    public static func encoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys, .prettyPrinted, .withoutEscapingSlashes]
        return encoder
    }

    public static func decoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let text = try container.decode(String.self)
            if let date = Timestamp.date(text) { return date }
            if let date = ISO8601DateFormatter().date(from: text) { return date }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Not an ISO-8601 date: \(text)")
        }
        return decoder
    }

    public func encoded() throws -> Data { try Self.encoder().encode(self) }
    public static func decode(_ data: Data) throws -> ExportDocumentV2 { try decoder().decode(ExportDocumentV2.self, from: data) }
}
