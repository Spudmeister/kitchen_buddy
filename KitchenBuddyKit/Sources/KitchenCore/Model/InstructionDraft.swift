/// One step as entered or imported; position comes from array order.
///
/// Requirements: kitchen-buddy-ios 1.1
public struct InstructionDraft: Hashable, Codable, Sendable {
    public var text: String
    public var durationMinutes: Int?
    public var notes: String?

    public init(text: String, durationMinutes: Int? = nil, notes: String? = nil) {
        self.text = text
        self.durationMinutes = durationMinutes
        self.notes = notes
    }

    public func normalized() -> InstructionDraft {
        var copy = self
        copy.text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        copy.notes = notes.flatMap(Text.trimmedOrNil)
        copy.durationMinutes = durationMinutes.flatMap { $0 > 0 ? $0 : nil }
        return copy
    }
}
