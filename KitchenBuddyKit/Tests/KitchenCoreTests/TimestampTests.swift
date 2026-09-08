import Foundation
import Testing
import KitchenCore

/// Feature: kitchen-buddy-ios, storage timestamps. Validates: Requirements 1.6
@Suite struct TimestampTests {
    @Test func normalizationIsIdempotentAndMillisecondPrecise() {
        let date = Date(timeIntervalSince1970: 1_757_340_187.123_456)
        let once = Timestamp.normalize(date)
        #expect(Timestamp.normalize(once) == once)
        #expect(Timestamp.string(once) == "2025-09-08T14:03:07.123Z")
        #expect(Timestamp.date("2025-09-08T14:03:07.123Z") == once)
        #expect(Timestamp.date("not a date") == nil)
    }
}
