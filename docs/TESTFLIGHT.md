# TestFlight — What to Test

Paste the block for the current build into App Store Connect › TestFlight ›
"What to Test", and keep the standing paragraph at the top.

## Standing paragraph

Kitchen Buddy is a digital recipe book: yours, on your phone, backed up. Every
change you make is kept forever (versions), "delete" archives, and the app
snapshots its database automatically and copies the newest one to iCloud
Drive (Files › iCloud Drive › Kitchen Buddy). If anything ever loses a recipe,
that is the bug we care about most: tell us exactly what you did.

Feedback: Settings › Send Feedback, or take a screenshot and use its Share
sheet → TestFlight to attach it.

## 0.4.0 (M9)

- Search from the iPhone Home screen (Spotlight) for a recipe title; tap the
  result — it should open the recipe.
- Press and hold the app icon: "New Recipe" and "Import from Clipboard".
- Try VoiceOver on a full create flow, and the largest text size in
  Settings › Accessibility on every screen.
- Send feedback through Settings.

## 0.3.0 (M6–M8)

- Add HEIC photos from camera and library, set a cover, zoom, check Library
  thumbnails.
- Share five recipe pages from Safari to Kitchen Buddy (a big site, a
  paywall, a blog, a non-recipe page); import one by pasting a URL.
- AirDrop a `.kbrecipes` between two phones; print a PDF from Files; export a
  full backup, delete-and-reinstall, import the backup.

## 0.2.0 (M4–M5)

- Settings › Units and default servings, then open a recipe.
- Edit a recipe three times, restore v1, confirm v4 appears. Duplicate and
  follow lineage. Nest folders three deep and try to move a folder into its
  own child. Rate, then tap the same star to clear.

## 0.1.0 (M1–M3)

- Create ten recipes by hand, edit, reorder ingredients, search, sort,
  archive/unarchive, largest text size. Report anything that loses data.
