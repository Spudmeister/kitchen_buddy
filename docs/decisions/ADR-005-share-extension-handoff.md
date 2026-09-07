# ADR-005: The Share Extension queues URLs; it never parses and never opens the database

**Status:** Accepted
**Date:** 2026-09-07

## Context

Sharing a recipe page from Safari is the primary way people capture recipes.
App extensions run in a second process with a small memory cap and their own
signing. The data-safety rules (ADR-003) require one writer.

## Decision

`KitchenBuddyShare` reads the shared `public.url`, appends it to
`pendingImportURLs` in the App Group `group.net.puddleglum.kitchenbuddy`
(UserDefaults suite), shows a one-line confirmation, and completes. It links
nothing from KitchenBuddyKit. The app drains the queue when it becomes active
and opens the import review editor (one URL → editor; several → a picker).
`kitchenbuddy://import?url=` is also registered for Shortcuts and deep links;
the queue is the guaranteed path.

## Consequences

- No GRDB, WAL, or network parsing inside the extension; nothing to keep in
  sync; simpler signing.
- Review happens in the app with the full editor, which is where it belongs.
