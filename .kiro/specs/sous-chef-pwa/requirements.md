# Requirements Document

## Introduction

Sous Chef PWA is a Progressive Web Application that provides the user interface for the Sous Chef recipe management system. It delivers a mobile-first, responsive experience that works across phones, tablets, and desktops. The app connects to the existing Sous Chef service layer (adapted for browser with sql.js) and provides offline-capable functionality through service workers and IndexedDB.

The UI is organized around three core stages of a cooking week:

1. **Planning Stage** - "What should we eat?" - Building menus, discovering recipes, getting inspiration
2. **Shopping Stage** - "What do we need to buy?" - Managing shopping lists at the store
3. **Cooking Stage** - "Let's make it!" - Following recipes, adapting on the fly, logging results

Each stage surfaces relevant features contextually - brainstorming shows up when planning, substitutions show up when cooking, leftovers tracking spans planning and shopping.

## Glossary

- **PWA**: Progressive Web App - a web application that can be installed on devices and works offline
- **App_Shell**: The minimal HTML, CSS, and JavaScript required to power the user interface
- **Service_Worker**: Background script that enables offline functionality and caching
- **Navigation_Shell**: The persistent navigation structure (bottom nav on mobile, sidebar on desktop)
- **Planning_View**: The hub for menu planning, recommendations, and recipe discovery
- **Shopping_View**: The UI for managing shopping lists at the store
- **Cooking_View**: The UI for following recipes and logging cook sessions
- **Recipe_Card**: A compact display of recipe info (photo, title, time, rating)
- **Recipe_Detail**: The full recipe view with ingredients, instructions, and actions
- **Cook_Mode**: A distraction-free view optimized for following a recipe while cooking
- **Modal**: An overlay dialog for focused tasks like editing or confirmation
- **Toast**: A brief notification message that appears and auto-dismisses

## Requirements

---

## PART 1: FOUNDATION

### Requirement 1: Progressive Web App Foundation

**User Story:** As a user, I want to install Sous Chef on my device and use it offline, so that I can access my recipes anywhere without internet.

#### Acceptance Criteria

1. THE App_Shell SHALL be installable on iOS, Android, and desktop browsers via "Add to Home Screen"
2. WHEN installed THEN the App_Shell SHALL launch in standalone mode without browser chrome
3. THE Service_Worker SHALL cache the App_Shell for offline access
4. WHEN offline THEN the App_Shell SHALL display all locally stored data without errors
5. WHEN online after being offline THEN the App_Shell SHALL sync any pending changes
6. THE App_Shell SHALL display an appropriate icon and splash screen on all platforms
7. WHEN the app is updated THEN the Service_Worker SHALL prompt users to refresh for the new version

### Requirement 2: Responsive Navigation

**User Story:** As a user, I want intuitive navigation that adapts to my device, so that I can easily move between the three stages on any screen size.

#### Acceptance Criteria

1. WHEN on mobile (< 768px) THEN the Navigation_Shell SHALL display a bottom navigation bar with icons for: Plan, Shop, Cook
2. WHEN on tablet/desktop (≥ 768px) THEN the Navigation_Shell SHALL display a collapsible sidebar
3. THE Navigation_Shell SHALL highlight the currently active stage
4. WHEN a user taps a navigation item THEN the Navigation_Shell SHALL navigate with smooth transition
5. WHEN on mobile THEN the Navigation_Shell SHALL hide during scroll down and show on scroll up
6. THE Navigation_Shell SHALL provide quick access to Settings and Search from any stage

### Requirement 3: Recipe Library (Shared Across Stages)

**User Story:** As a user, I want to browse and search my recipes, so that I can find what I need in any stage.

#### Acceptance Criteria

1. THE App_Shell SHALL provide a searchable recipe library accessible from all stages
2. WHEN a user types in the search bar THEN the results SHALL filter in real-time
3. WHEN a user applies tag filters THEN the results SHALL show only matching recipes
4. WHEN a user applies rating filters THEN the results SHALL show only recipes meeting the minimum
5. THE library SHALL support sorting by: name, rating, date added, last cooked, cook time
6. WHEN scrolling THEN the library SHALL load more recipes incrementally (infinite scroll)
7. WHEN no recipes match THEN the library SHALL display a helpful empty state

---

## PART 2: PLANNING STAGE

### Requirement 4: Planning Hub

**User Story:** As a user, I want a central place to plan my meals, so that I can organize what to cook for the week.

#### Acceptance Criteria

1. WHEN entering the Planning_View THEN the App_Shell SHALL display the current menu (or prompt to create one)
2. THE Planning_View SHALL show a calendar/timeline of planned meals
3. THE Planning_View SHALL surface contextual actions: "Need inspiration?", "What's in the fridge?", "Ask Sue"
4. THE Planning_View SHALL show upcoming leftover expiration dates as reminders
5. WHEN a menu is empty THEN the Planning_View SHALL suggest ways to get started

### Requirement 5: Menu Building

**User Story:** As a user, I want to assign recipes to specific days and meals, so that I have a clear plan.

#### Acceptance Criteria

1. WHEN a user taps a date THEN the Planning_View SHALL show meal slots (breakfast, lunch, dinner, snack)
2. WHEN a user taps an empty slot THEN the Planning_View SHALL open a recipe picker
3. WHEN a recipe is assigned THEN the Planning_View SHALL display the recipe name and leftover expiry
4. WHEN a user long-presses an assignment THEN the Planning_View SHALL allow moving or removing it
5. WHEN a user drags an assignment THEN the Planning_View SHALL allow repositioning to another date/slot
6. THE Planning_View SHALL allow creating menus for any date range
7. THE Planning_View SHALL show total estimated cook time for each day

### Requirement 6: Recipe Discovery and Recommendations

**User Story:** As a user, I want recipe suggestions based on my history, so that I can discover what to cook.

#### Acceptance Criteria

1. THE Planning_View SHALL display recommendation sections: Favorites, Deep Cuts, Recently Added, Haven't Made Lately
2. WHEN a user taps "Favorites" THEN the Planning_View SHALL show highly-rated AND frequently-cooked recipes
3. WHEN a user taps "Deep Cuts" THEN the Planning_View SHALL show well-rated but rarely-cooked recipes
4. WHEN a user taps a Recipe_Card THEN the Planning_View SHALL show a quick preview with "Add to Menu" action
5. THE Planning_View SHALL allow filtering recommendations by time, tags, or dietary restrictions

### Requirement 7: Brainstorm Mode ("What's in the Fridge?")

**User Story:** As a user, I want to find recipes based on ingredients I have, so that I can reduce waste and use what's available.

#### Acceptance Criteria

1. WHEN a user taps "What's in the fridge?" THEN the Planning_View SHALL display an ingredient entry interface
2. WHEN a user enters available ingredients THEN the Planning_View SHALL show matching recipes
3. THE results SHALL be sorted by number of missing ingredients (fewest first)
4. THE results SHALL show which ingredients match and which are missing for each recipe
5. THE results SHALL show substitution options for missing ingredients
6. WHEN a user taps a recipe THEN the Planning_View SHALL show preview with "Add to Menu" action

### Requirement 8: Menu Assistant (Sue)

**User Story:** As a user, I want to chat with Sue to get menu suggestions, so that I can get inspiration based on my preferences.

#### Acceptance Criteria

1. WHERE AI features are enabled THEN the Planning_View SHALL display a chat interface for Sue
2. WHEN a user sends a message THEN Sue SHALL respond with recipe suggestions from the user's collection
3. WHEN Sue suggests a recipe THEN the Planning_View SHALL display it as a tappable Recipe_Card
4. WHEN a user accepts a suggestion THEN Sue SHALL add it to the current menu
5. WHEN a user specifies constraints (dietary, time, ingredients) THEN Sue SHALL filter suggestions
6. WHEN a user asks for variety THEN Sue SHALL avoid repeating cuisines or main ingredients
7. WHERE AI features are disabled THEN the Sue interface SHALL be hidden

### Requirement 9: Leftover Planning

**User Story:** As a user, I want to see when leftovers expire, so that I can plan to use them before they go bad.

#### Acceptance Criteria

1. WHEN a recipe is added to the menu THEN the Planning_View SHALL calculate and display leftover expiry
2. THE Planning_View SHALL highlight recipes with leftovers expiring soon
3. WHEN planning a day THEN the Planning_View SHALL suggest using available leftovers
4. THE Planning_View SHALL allow marking a meal as "leftovers from [recipe]" without re-cooking

---

## PART 3: SHOPPING STAGE

### Requirement 10: Shopping List Generation

**User Story:** As a user, I want to generate a shopping list from my menu, so that I know what to buy.

#### Acceptance Criteria

1. WHEN a user generates a shopping list THEN the Shopping_View SHALL consolidate all ingredients from the menu
2. WHEN multiple recipes use the same ingredient THEN the Shopping_View SHALL combine quantities
3. THE Shopping_View SHALL organize items by store category (produce, dairy, meat, etc.)
4. THE Shopping_View SHALL show which recipes need each ingredient
5. THE Shopping_View SHALL display cook-by dates for time-sensitive items

### Requirement 11: Shopping at the Store

**User Story:** As a user, I want to check off items as I shop, so that I can track my progress.

#### Acceptance Criteria

1. WHEN a user taps an item THEN the Shopping_View SHALL toggle its checked state
2. WHEN an item is checked THEN the Shopping_View SHALL show it with strikethrough and move it down
3. THE Shopping_View SHALL show progress (e.g., "12 of 18 items")
4. WHEN all items are checked THEN the Shopping_View SHALL display a completion message
5. THE Shopping_View SHALL allow unchecking items if needed
6. THE Shopping_View SHALL work fully offline

### Requirement 12: Custom Shopping Items

**User Story:** As a user, I want to add items not from recipes, so that I can have a complete shopping list.

#### Acceptance Criteria

1. WHEN a user taps "Add Item" THEN the Shopping_View SHALL allow entering a custom item
2. THE Shopping_View SHALL allow assigning a category to custom items
3. THE Shopping_View SHALL distinguish custom items from recipe-generated items
4. WHEN a user deletes a custom item THEN the Shopping_View SHALL remove it from the list

---

## PART 4: COOKING STAGE

### Requirement 13: Recipe Display

**User Story:** As a user, I want to view my recipes clearly, so that I can follow them while cooking.

#### Acceptance Criteria

1. WHEN viewing a recipe THEN the Recipe_Detail SHALL display: title, photo, description, times, servings, rating, tags
2. THE Recipe_Detail SHALL display ingredients in a clear list with quantities and units
3. THE Recipe_Detail SHALL display instructions as numbered steps
4. THE Recipe_Detail SHALL show cook statistics (times cooked, average time) when available
5. WHEN a user taps an ingredient THEN the Recipe_Detail SHALL allow checking it off (strikethrough)
6. THE Recipe_Detail SHALL provide quick actions: Scale, Convert Units, Start Cooking

### Requirement 14: Scaling and Unit Conversion

**User Story:** As a user, I want to scale recipes and convert units, so that I can cook for any number of people.

#### Acceptance Criteria

1. WHEN a user taps Scale THEN the Recipe_Detail SHALL show a servings adjuster
2. WHEN servings change THEN the Recipe_Detail SHALL update all ingredient quantities
3. WHEN a user taps Unit Toggle THEN the Recipe_Detail SHALL convert between US and metric
4. THE Recipe_Detail SHALL round to practical cooking measurements (not 0.333 cups)
5. THE Recipe_Detail SHALL remember the user's preferred unit system

### Requirement 15: Ingredient Substitutions

**User Story:** As a user, I want to see substitution options when I'm missing an ingredient, so that I can adapt on the fly.

#### Acceptance Criteria

1. WHEN viewing an ingredient THEN the Recipe_Detail SHALL show a substitution icon if alternatives exist
2. WHEN a user taps the substitution icon THEN the Recipe_Detail SHALL display available alternatives
3. THE substitution panel SHALL show conversion ratios for each substitute
4. THE substitution panel SHALL show notes about expected differences (e.g., "may add coconut flavor")
5. WHEN a user selects a substitution THEN the Recipe_Detail SHALL update the ingredient display

### Requirement 16: Cook Mode

**User Story:** As a user, I want a distraction-free cooking view, so that I can follow recipes hands-free in the kitchen.

#### Acceptance Criteria

1. WHEN a user taps "Start Cooking" THEN Cook_Mode SHALL display one instruction step at a time in large text
2. WHEN in Cook_Mode THEN the screen SHALL stay awake
3. WHEN in Cook_Mode THEN the UI SHALL provide large tap targets for next/previous step
4. WHEN in Cook_Mode THEN the UI SHALL display relevant ingredients for the current step
5. WHEN a user swipes left/right THEN Cook_Mode SHALL navigate between steps
6. IF a step has a timer duration THEN Cook_Mode SHALL offer to start a timer
7. WHEN in Cook_Mode THEN the UI SHALL provide a button to view all ingredients

### Requirement 17: Cook Session Logging

**User Story:** As a user, I want to log my cook sessions, so that I can track my cooking history and improve time estimates.

#### Acceptance Criteria

1. WHEN a user finishes Cook_Mode THEN the App_Shell SHALL prompt to log the session
2. THE logging form SHALL allow entering actual prep time and cook time
3. THE logging form SHALL allow entering servings made and notes
4. THE logging form SHALL capture the exact configuration used (scale, units, modifications)
5. WHEN a session is logged THEN the Recipe_Detail SHALL update cook statistics
6. WHEN viewing cook history THEN the Recipe_Detail SHALL show all past sessions with configurations

### Requirement 18: Photo Capture

**User Story:** As a user, I want to take photos while cooking, so that I can document my results.

#### Acceptance Criteria

1. WHEN in Cook_Mode THEN the UI SHALL provide a camera button
2. WHEN a user taps the camera THEN the App_Shell SHALL offer camera capture or gallery selection
3. WHEN a photo is taken THEN the App_Shell SHALL associate it with the current cook session
4. THE App_Shell SHALL support JPEG, PNG, HEIC, and HEIF formats
5. WHEN viewing a recipe THEN the Recipe_Detail SHALL display photos grouped by cook session
6. WHEN viewing a photo THEN the App_Shell SHALL allow navigation to the exact configuration used

### Requirement 19: Meal Prep Mode

**User Story:** As a user, I want to batch cook efficiently, so that I can prepare multiple recipes at once.

#### Acceptance Criteria

1. WHEN a user selects multiple recipes THEN the Cooking_View SHALL offer "Meal Prep Mode"
2. WHEN in Meal Prep Mode THEN the UI SHALL display consolidated prep tasks
3. THE tasks SHALL be grouped by shared ingredients (e.g., "Chop onions for Recipes A, B, C")
4. WHEN a user taps a task THEN the UI SHALL toggle its completion state
5. THE UI SHALL show which recipes each task serves
6. THE UI SHALL display total estimated time and progress
7. WHEN all tasks complete THEN the UI SHALL prompt to log cook sessions for all recipes

---

## PART 5: RECIPE MANAGEMENT

### Requirement 20: Recipe Creation

**User Story:** As a user, I want to create and edit recipes, so that I can build my personal collection.

#### Acceptance Criteria

1. WHEN a user taps "Add Recipe" THEN the App_Shell SHALL present options: manual entry, import from URL, import from photo
2. WHEN creating manually THEN the form SHALL allow entering all recipe fields
3. WHEN editing ingredients THEN the form SHALL allow adding, removing, and reordering items
4. WHEN editing instructions THEN the form SHALL allow adding, removing, and reordering steps
5. WHEN saving THEN the form SHALL validate required fields (title, at least one ingredient, at least one step)
6. WHEN editing an existing recipe THEN the App_Shell SHALL create a new version (not overwrite)

### Requirement 21: Recipe Import

**User Story:** As a user, I want to import recipes from websites and photos, so that I can quickly add recipes.

#### Acceptance Criteria

1. WHEN a user enters a URL THEN the App_Shell SHALL fetch and parse the recipe
2. WHEN parsing succeeds THEN the App_Shell SHALL display the extracted recipe for review
3. WHEN parsing fails THEN the App_Shell SHALL display an error and offer manual entry
4. WHEN a user uploads a photo THEN the App_Shell SHALL use AI to extract recipe data
5. WHEN visual parsing shows low confidence fields THEN the App_Shell SHALL highlight them
6. WHERE AI features are disabled THEN the photo import option SHALL be hidden

### Requirement 22: Recipe Versioning

**User Story:** As a user, I want to see and restore previous versions, so that I can track changes and undo mistakes.

#### Acceptance Criteria

1. WHEN viewing a recipe THEN the Recipe_Detail SHALL show the current version number
2. WHEN a user taps "History" THEN the Recipe_Detail SHALL display all versions with timestamps
3. WHEN a user selects a previous version THEN the Recipe_Detail SHALL show that version's content
4. WHEN a user taps "Restore" THEN the App_Shell SHALL create a new version with that content

### Requirement 23: Recipe Duplication and Heritage

**User Story:** As a user, I want to duplicate recipes and track their lineage, so that I can create variations.

#### Acceptance Criteria

1. WHEN a user taps "Duplicate" THEN the App_Shell SHALL create a copy linked to the original
2. WHEN viewing a duplicated recipe THEN the Recipe_Detail SHALL show a link to the parent
3. WHEN viewing a recipe with children THEN the Recipe_Detail SHALL show links to derived recipes
4. WHEN a user taps "Delete" THEN the App_Shell SHALL archive (not permanently delete)

### Requirement 24: Folder Organization

**User Story:** As a user, I want to organize recipes into folders, so that I can group related recipes.

#### Acceptance Criteria

1. THE recipe library SHALL display folders as navigable containers
2. WHEN a user creates a folder THEN the App_Shell SHALL add it to the folder list
3. WHEN a user moves a recipe to a folder THEN the library SHALL update the organization
4. THE App_Shell SHALL support nested folders
5. WHEN exporting a folder THEN the export SHALL include all recipes in that folder

### Requirement 25: Rating

**User Story:** As a user, I want to rate my recipes, so that I can remember which ones I loved.

#### Acceptance Criteria

1. WHEN viewing a recipe THEN the Recipe_Detail SHALL display a 5-star rating control
2. WHEN a user taps a star THEN the rating SHALL save immediately
3. WHEN a user views rating history THEN the Recipe_Detail SHALL show all ratings with dates
4. THE recipe library SHALL allow filtering and sorting by rating

---

## PART 6: STATISTICS AND SETTINGS

### Requirement 26: Personal Statistics

**User Story:** As a user, I want to see my cooking statistics, so that I can reflect on my habits.

#### Acceptance Criteria

1. THE App_Shell SHALL display statistics: total recipes, total cook sessions, most-cooked recipes
2. THE App_Shell SHALL display favorite tags and cuisines based on cooking frequency
3. WHEN a user selects a time period THEN the statistics SHALL filter to that range
4. THE App_Shell SHALL show comparisons to previous periods when data exists

### Requirement 27: Year in Review

**User Story:** As a user, I want a year-end summary, so that I can see my cooking journey.

#### Acceptance Criteria

1. WHEN a user requests year in review THEN the App_Shell SHALL display a summary with visualizations
2. THE summary SHALL include: total sessions, unique recipes, new recipes added, top recipes, top tags
3. THE summary SHALL display cooking streaks and monthly activity
4. THE summary SHALL be shareable as an image or PDF

### Requirement 28: Settings and Preferences

**User Story:** As a user, I want to configure the app, so that it works the way I like.

#### Acceptance Criteria

1. THE Settings SHALL include: default unit system, default servings, leftover duration
2. THE Settings SHALL include: theme (light/dark/system), text size
3. WHERE AI features are available THEN Settings SHALL include AI provider configuration
4. THE Settings SHALL include data management: export all, import, clear data
5. WHEN a preference changes THEN the App_Shell SHALL apply it immediately
6. THE App_Shell SHALL persist all preferences across sessions

### Requirement 29: Export and Import

**User Story:** As a user, I want to export and import my data, so that I can back up and share.

#### Acceptance Criteria

1. WHEN a user taps "Export Recipe" THEN the App_Shell SHALL offer PDF or JSON export
2. WHEN exporting to PDF THEN the App_Shell SHALL generate a formatted document
3. WHEN exporting to JSON THEN the App_Shell SHALL trigger a file download
4. WHEN a user taps "Import" THEN the App_Shell SHALL open a file picker
5. WHEN importing THEN the App_Shell SHALL validate and preview before saving

---

## PART 7: CROSS-CUTTING CONCERNS

### Requirement 30: Accessibility

**User Story:** As a user with accessibility needs, I want the app to be usable with assistive technologies.

#### Acceptance Criteria

1. THE App_Shell SHALL support screen readers with proper ARIA labels
2. THE App_Shell SHALL support keyboard navigation for all interactive elements
3. THE App_Shell SHALL maintain sufficient color contrast (WCAG AA)
4. THE App_Shell SHALL support text scaling up to 200%
5. THE App_Shell SHALL not rely solely on color to convey information

### Requirement 31: Performance

**User Story:** As a user, I want the app to be fast and responsive.

#### Acceptance Criteria

1. THE App_Shell SHALL achieve a Lighthouse performance score of 90+
2. THE App_Shell SHALL load the initial view within 2 seconds on 3G
3. WHEN searching THEN results SHALL appear within 100ms
4. WHEN navigating THEN transitions SHALL complete within 300ms
5. THE App_Shell SHALL lazy-load images
6. THE App_Shell SHALL use virtualized lists for large collections

