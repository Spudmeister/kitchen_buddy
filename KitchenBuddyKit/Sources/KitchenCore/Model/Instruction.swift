/// A stored, numbered step of one recipe version. Immutable like its version.
///
/// Requirements: kitchen-buddy-ios 1.1, 2.1
public struct Instruction: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<Instruction>

    public let id: ID
    /// 1-based position within the version.
    public var step: Int
    public var text: String
    public var durationMinutes: Int?
    public var notes: String?

    public init(id: ID = ID(), step: Int, text: String, durationMinutes: Int? = nil, notes: String? = nil) {
        self.id = id
        self.step = step
        self.text = text
        self.durationMinutes = durationMinutes
        self.notes = notes
    }

    public init(id: ID = ID(), step: Int, _ draft: InstructionDraft) {
        self.init(id: id, step: step, text: draft.text, durationMinutes: draft.durationMinutes, notes: draft.notes)
    }

    public var draft: InstructionDraft {
        InstructionDraft(text: text, durationMinutes: durationMinutes, notes: notes)
    }
}
