// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "KitchenBuddyKit",
    platforms: [
        .iOS(.v17),
        .macOS(.v15),  // macOS so the whole package builds & `swift test` runs without Xcode
    ],
    // Swift 5 language mode on the 6.0 toolchain (same as backgammon/cardplay):
    // pragmatic concurrency checking; types are written Sendable-clean so the
    // move to .v6 is a one-line change later.
    products: [
        .library(name: "KitchenCore", targets: ["KitchenCore"]),
        .library(name: "KitchenPersistence", targets: ["KitchenPersistence"]),
        .library(name: "KitchenUI", targets: ["KitchenUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/groue/GRDB.swift.git", from: "7.0.0"),
    ],
    targets: [
        // Pure value types and pure functions: Fraction, units, scaling,
        // practical rounding, tag detection, schema.org parsing, export codables.
        // Foundation only — no GRDB, no UI, no network.
        .target(name: "KitchenCore", resources: [.process("Resources")]),

        // SQLite via GRDB, files, network, backups. The ONLY target that may
        // `import GRDB`; it exposes stores through protocols, never GRDB types.
        .target(
            name: "KitchenPersistence",
            dependencies: [
                "KitchenCore",
                .product(name: "GRDB", package: "GRDB.swift"),
            ]
        ),

        // SwiftUI screens + @Observable view models. Compiles for macOS too so
        // view models unit-test headlessly; UIKit-only code sits behind
        // `#if canImport(UIKit)`.
        .target(name: "KitchenUI", dependencies: ["KitchenCore", "KitchenPersistence"]),

        // Seeded generators and temp-database helpers shared by every test
        // target. Never linked by the app.
        .target(
            name: "KitchenTesting",
            dependencies: ["KitchenCore", "KitchenPersistence"],
            resources: [.copy("Resources")]
        ),

        .testTarget(
            name: "KitchenCoreTests",
            dependencies: ["KitchenCore", "KitchenTesting"],
            resources: [.copy("fixtures")]
        ),
        .testTarget(
            name: "KitchenPersistenceTests",
            dependencies: ["KitchenPersistence", "KitchenTesting"],
            resources: [.copy("fixtures")]
        ),
        .testTarget(
            name: "KitchenUITests",
            dependencies: ["KitchenUI", "KitchenTesting"]
        ),
    ],
    swiftLanguageModes: [.v5]
)
