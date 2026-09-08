import Testing
import KitchenCore

/// Feature: kitchen-buddy-ios, quantity entry. Validates: Requirements 1.3
@Suite struct QuantityParserTests {
    @Test(arguments: [
        ("1 1/2", Fraction(3, 2)), ("1½", Fraction(3, 2)), ("1 ½", Fraction(3, 2)), ("¾", Fraction(3, 4)),
        ("0.75", Fraction(3, 4)), ("3/4", Fraction(3, 4)), ("2", Fraction(2)), (".5", Fraction(1, 2)),
        ("1-1/2", Fraction(3, 2)), ("1,5", Fraction(3, 2)), ("13/4", Fraction(13, 4)), (" 2 ", Fraction(2)),
        ("⅛", Fraction(1, 8)), ("2⅔", Fraction(8, 3)), ("1⁄3", Fraction(1, 3)), ("0", Fraction(0)),
        ("0.333", Fraction(333, 1000)),
    ])
    func parsesCookbookForms(text: String, expected: Fraction) {
        #expect(QuantityParser.parse(text) == expected)
    }

    @Test(arguments: ["", "  ", "abc", "1/0", "-1", "1-2", "1.2.3", "1/2/3", "½½", "1e3", "+2"])
    func rejectsEverythingElse(text: String) {
        #expect(QuantityParser.parse(text) == nil)
    }
}
