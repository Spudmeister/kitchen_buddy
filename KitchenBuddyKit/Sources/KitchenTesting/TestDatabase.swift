import Foundation
import KitchenCore
import KitchenPersistence

/// Temporary databases for tests: private in-memory books with a stepping
/// clock, or on-disk layouts under the system temporary directory for
/// tests that need reopen, snapshots, or files.
public enum TestDatabase {
    /// 2026-01-01T00:00:00Z, advancing one second per call.
    public static func clock() -> Clock {
        Clock.stepping(from: Date(timeIntervalSince1970: 1_767_225_600))
    }

    public static func inMemory(clock: Clock? = nil) throws -> RecipeBook {
        try RecipeBook.openInMemory(clock: clock ?? self.clock())
    }

    /// A fresh directory that does not exist yet.
    public static func temporaryLayout() -> DatabaseStack.Layout {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("kb-test-\(UUID().uuidString)", isDirectory: true)
        return DatabaseStack.Layout(root: root)
    }

    public static func onDisk(clock: Clock? = nil) throws -> (book: RecipeBook, layout: DatabaseStack.Layout) {
        let layout = temporaryLayout()
        return (try RecipeBook.open(layout, clock: clock ?? self.clock()), layout)
    }

    public static func remove(_ layout: DatabaseStack.Layout) {
        try? FileManager.default.removeItem(at: layout.root)
    }
}
