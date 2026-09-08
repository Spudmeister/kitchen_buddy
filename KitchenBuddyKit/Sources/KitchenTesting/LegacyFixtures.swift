import Foundation
import KitchenCore

/// The committed v1-era recipe fixtures (the 34 PWA test recipes, also the
/// app's demo seed). Must decode forever (iron rule 5).
public enum LegacyFixtures {
    public static func recipesV1Data() throws -> Data {
        guard let url = Bundle.module.url(forResource: "recipes-v1", withExtension: "json", subdirectory: "Resources") else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try Data(contentsOf: url)
    }

    public static func recipesV1() throws -> [RecipeDraft] {
        try LegacyV1Reader.read(try recipesV1Data())
    }
}
