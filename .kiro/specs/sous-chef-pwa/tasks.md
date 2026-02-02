# Implementation Plan: Sous Chef PWA

## Overview

This implementation plan builds the Sous Chef PWA frontend in incremental phases, starting with foundation infrastructure and progressively adding features. Each task builds on previous work, ensuring no orphaned code. The plan prioritizes core recipe capabilities early since they're used throughout the app.

## Tasks

- [x] 1. Project Setup and Foundation
  - [x] 1.1 Initialize React project with Vite, TypeScript, and Tailwind CSS
    - Create project structure with `src/components`, `src/hooks`, `src/stores`, `src/routes`
    - Configure TypeScript with strict mode
    - Set up Tailwind with mobile-first breakpoints
    - Configure path aliases for clean imports
    - _Requirements: 1.1, 33.1_

  - [x] 1.2 Set up sql.js database integration
    - Install sql.js and configure WASM loading
    - Create BrowserDatabase class wrapping sql.js
    - Implement IndexedDB persistence for database file
    - Adapt existing schema.ts for browser environment
    - _Requirements: 1.3, 1.4_

  - [x] 1.3 Adapt existing services for browser
    - Create browser-compatible Database interface
    - Adapt RecipeService, MenuService, ShoppingService for sql.js
    - Adapt StatisticsService, AIService, MenuAssistantService
    - Ensure all services work with async database operations
    - _Requirements: 1.4, 1.5_

  - [x] 1.4 Set up state management
    - Install and configure Zustand for UI state
    - Install and configure React Query for data caching
    - Create UIStore with navigation, modals, toasts, preferences
    - Create query hooks for recipes, menus, shopping lists
    - _Requirements: 1.4, 30.5_

  - [x] 1.5 Write property test for database persistence round-trip
    - **Property: Database Persistence Round-Trip**
    - Test that data written to sql.js persists to IndexedDB and loads correctly
    - **Validates: Requirements 1.4**

- [x] 2. PWA Infrastructure
  - [x] 2.1 Configure service worker with Workbox
    - Set up Workbox for app shell caching
    - Configure cache-first strategy for static assets
    - Configure stale-while-revalidate for photos
    - Implement offline detection
    - _Requirements: 1.3, 1.4_

  - [x] 2.2 Create web app manifest
    - Define app name, icons, theme colors
    - Configure standalone display mode
    - Set up splash screens for iOS/Android
    - _Requirements: 1.1, 1.2, 1.6_

  - [x] 2.3 Implement offline indicator component
    - Create useOnlineStatus hook
    - Create OfflineIndicator banner component
    - Show/hide based on navigator.onLine
    - _Requirements: 1.4_

  - [x] 2.4 Write property test for offline data availability
    - **Property 12: Offline Data Availability**
    - Test that locally stored recipes/menus display without errors when offline
    - **Validates: Requirements 1.4**

- [x] 3. App Shell and Navigation
  - [x] 3.1 Create App Shell component
    - Implement root layout with navigation container
    - Add toast notification system
    - Add modal container
    - Integrate offline indicator
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 Create Navigation Shell component
    - Implement bottom bar for mobile (< 768px)
    - Implement sidebar for desktop (≥ 768px)
    - Add Plan, Shop, Cook tabs with icons
    - Add global search button and settings access
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Set up React Router with lazy loading
    - Configure routes for all views
    - Implement code splitting with React.lazy
    - Add route guards and redirects
    - Support deep linking to any route
    - _Requirements: 2.6_

  - [x] 3.4 Write property test for navigation responsiveness
    - **Property 13: Navigation Responsiveness**
    - Test bottom bar renders on mobile, sidebar on desktop
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [x] 3.5 Write property test for deep link resolution
    - **Property 15: Deep Link Resolution**
    - Test that direct URL navigation renders correct views
    - **Validates: Requirements 2.6**

- [x] 4. Checkpoint - Foundation Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Core Recipe Components - Display
  - [x] 5.1 Create Recipe Card component
    - Implement compact, standard, detailed variants
    - Display photo, title, rating, time
    - Add long-press/menu for quick actions
    - Make fully accessible with ARIA labels
    - _Requirements: 4.5, 11.1, 32.1_

  - [x] 5.2 Create Recipe Detail component
    - Display all recipe fields (title, photos, description, times, servings, rating, tags)
    - Display ingredients list with quantities and units
    - Display numbered instruction steps
    - Show cook statistics when available
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.3 Write property test for recipe detail completeness
    - **Property 7: Recipe Detail Completeness**
    - Test all required fields display, stats show when sessions exist
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 6. Core Recipe Components - Scaling and Units
  - [x] 6.1 Create Scale Control component
    - Implement stepper with +/- buttons
    - Allow direct input of servings
    - Display scale factor (e.g., "2x")
    - _Requirements: 5.1, 5.2_

  - [x] 6.2 Create Unit Toggle component
    - Implement segmented control (US | Metric)
    - Persist preference to localStorage
    - Apply default from user preferences
    - _Requirements: 5.3, 5.5_

  - [x] 6.3 Integrate scaling into Recipe Detail
    - Connect Scale Control to ingredient quantities
    - Apply practical rounding to scaled values
    - Persist scale for session
    - _Requirements: 5.2, 5.4, 5.6_

  - [x] 6.4 Write property test for recipe scaling accuracy
    - **Property 1: Recipe Scaling Accuracy**
    - Test scaling multiplies quantities correctly with practical rounding
    - **Validates: Requirements 5.2, 5.4**

  - [x] 6.5 Write property test for unit conversion consistency
    - **Property 2: Unit Conversion Consistency**
    - Test US→metric→US produces values within 1% of original
    - **Validates: Requirements 5.3, 5.5**

- [x] 7. Core Recipe Components - Quick Actions
  - [x] 7.1 Create Quick Actions Menu component
    - Implement dropdown for desktop
    - Implement bottom sheet for mobile
    - Include: Cook Now, Add to Menu, Scale, Share, Edit, Duplicate, Delete
    - _Requirements: 11.1, 11.2_

  - [x] 7.2 Wire Quick Actions to Recipe Card
    - Add menu icon trigger
    - Add long-press trigger for mobile
    - Connect actions to navigation/mutations
    - _Requirements: 11.1, 11.3, 11.4_

  - [x] 7.3 Write property test for quick actions availability
    - **Property 4: Quick Actions Availability**
    - Test same actions available on Recipe_Card in all views
    - **Validates: Requirements 11.1, 11.3, 11.5**

- [x] 8. Core Recipe Components - Photos and Rating
  - [x] 8.1 Create Photo Gallery component
    - Display photos in grid/carousel
    - Group by cook session when applicable
    - Support tap to view full size
    - Navigate to session configuration from photo
    - _Requirements: 7.1, 7.4, 7.5_

  - [x] 8.2 Create photo capture/upload functionality
    - Implement camera capture via MediaDevices API
    - Implement gallery selection via file input
    - Support JPEG, PNG, HEIC, HEIF formats
    - Store photos in IndexedDB
    - _Requirements: 7.2, 7.3_

  - [x] 8.3 Create Rating Control component
    - Implement 5-star interactive control
    - Save immediately on tap
    - Show rating history on request
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 8.4 Write property test for photo organization
    - **Property 8: Photo Organization**
    - Test photos grouped by session, navigation to session config works
    - **Validates: Requirements 7.1, 7.4, 7.5**

  - [x] 8.5 Write property test for rating persistence
    - **Property 9: Rating Persistence**
    - Test rating saves immediately and appears on Recipe_Cards
    - **Validates: Requirements 8.2, 8.4**

  - [x] 8.6 Write property test for photo format support
    - **Property 14: Photo Format Support**
    - Test JPEG, PNG, HEIC, HEIF all accepted and display correctly
    - **Validates: Requirements 7.3**

- [x] 9. Core Recipe Components - Versioning and Heritage
  - [x] 9.1 Create Version History component
    - Display all versions with timestamps
    - Allow viewing any previous version
    - Implement restore functionality (creates new version)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 9.2 Create Recipe Heritage component
    - Display link to parent recipe if duplicated
    - Display links to child recipes if any
    - Show full ancestor chain on request
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 9.3 Implement soft delete for recipes
    - Archive instead of permanent delete
    - Hide archived recipes from normal views
    - _Requirements: 10.4_

  - [x] 9.4 Write property test for recipe versioning integrity
    - **Property 3: Recipe Versioning Integrity**
    - Test edits create new versions, restore creates new version with old content
    - **Validates: Requirements 6.4, 6.5**

  - [x] 9.5 Write property test for recipe heritage display
    - **Property 11: Recipe Heritage Display**
    - Test parent/child links visible, delete archives instead of removes
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

- [x] 10. Core Recipe Components - Substitutions
  - [x] 10.1 Create Substitution Panel component
    - Display alternatives with conversion ratios
    - Show notes about expected differences
    - Allow selecting a substitution
    - _Requirements: 9.2, 9.3, 9.4_

  - [x] 10.2 Add substitution indicators to ingredients
    - Show icon for ingredients with known substitutions
    - Open panel on tap
    - Update ingredient display when substitution selected
    - _Requirements: 9.1, 9.5_

  - [x] 10.3 Write property test for substitution display
    - **Property 10: Substitution Display**
    - Test indicator appears, panel shows ratios and notes
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [x] 11. Checkpoint - Core Recipe Components Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Recipe Library and Search
  - [x] 12.1 Create Recipe Library view
    - Display recipes in responsive grid
    - Implement infinite scroll with virtualization
    - Show empty state with suggestions
    - _Requirements: 3.1, 3.5, 3.6_

  - [x] 12.2 Create Search component
    - Implement real-time filtering
    - Search across title, ingredients, tags, instructions
    - _Requirements: 3.2_

  - [x] 12.3 Create filter and sort controls
    - Filter by: tags, rating, cook time, folder
    - Sort by: name, rating, date added, last cooked, cook time
    - Support built-in dietary tags
    - _Requirements: 3.3, 3.4, 3.7_

  - [x] 12.4 Write property test for search result completeness
    - **Property 5: Search Result Completeness**
    - Test results include all matching recipes across all searchable fields
    - **Validates: Requirements 3.2, 3.3**

  - [x] 12.5 Write property test for sort order correctness
    - **Property 6: Sort Order Correctness**
    - Test each sort option produces correctly ordered results
    - **Validates: Requirements 3.4**

- [x] 13. Recipe Instances and Meta
  - [x] 13.1 Create Recipe Instance component
    - Display cook session configuration (scale, units, substitutions)
    - Show photos and notes from session
    - Implement "Recreate" to load exact configuration
    - _Requirements: 7.4, 23.4_

  - [x] 13.2 Create Recipe Meta component
    - Display cook statistics (times cooked, avg/min/max times)
    - Display rating history over time
    - Show estimated vs actual time comparison
    - _Requirements: 4.4_

  - [x] 13.3 Integrate instances and meta into Recipe Detail
    - Add instances list section
    - Add meta statistics section
    - Navigate from photo to instance
    - _Requirements: 4.4, 7.4_

- [x] 14. Planning Flow - Menu Calendar
  - [x] 14.1 Create Planning View
    - Display current menu as calendar/timeline
    - Show leftover expiration dates
    - Surface discovery options (Recommendations, Brainstorm, Sue)
    - Show getting-started suggestions when empty
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 14.2 Create Menu Calendar component
    - Display date range with meal slots
    - Show assigned recipes with leftover expiry
    - Support drag-and-drop for moving assignments
    - Show total cook time per day
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 14.3 Create recipe picker for menu slots
    - Open on empty slot tap
    - Search and filter recipes
    - Assign recipe to date/slot
    - _Requirements: 13.2, 13.3_

- [x] 15. Planning Flow - Recommendations
  - [x] 15.1 Create Recommendation Section component
    - Display "Favorites" (highly-rated AND frequently-cooked)
    - Display "Deep Cuts" (well-rated but rarely-cooked)
    - Display "Recently Added" and "Haven't Made Lately"
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 15.2 Wire recommendations to Recipe Detail
    - Tap recommendation opens Recipe Detail
    - Quick Actions available on recommendation cards
    - _Requirements: 14.6_

- [x] 16. Planning Flow - Brainstorm
  - [x] 16.1 Create Brainstorm View
    - Implement ingredient entry interface
    - Display matching recipes sorted by missing ingredient count
    - Show which ingredients match and which are missing
    - Show substitution options for missing ingredients
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 16.2 Wire brainstorm results to Recipe Detail
    - Tap result opens Recipe Detail with Quick Actions
    - _Requirements: 15.6_

- [x] 17. Planning Flow - Sue (Menu Assistant)
  - [x] 17.1 Create Sue Chat component
    - Implement conversational interface
    - Display message history
    - Show suggestions as tappable Recipe_Cards
    - Add typing indicator
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 17.2 Create Sue Constraints Panel
    - Set dietary restrictions
    - Set time limits
    - Specify available/excluded ingredients
    - Filter by rating and tags
    - _Requirements: 16.5_

  - [x] 17.3 Create Sue Suggestion Card
    - Display recipe with Sue's reason
    - Show confidence indicator
    - Add Accept/Reject/View actions
    - _Requirements: 16.3, 16.4_

  - [x] 17.4 Create Sue Quick Prompts
    - Display pre-built prompts
    - Send prompt on tap
    - _Requirements: 16.2_

  - [x] 17.5 Implement Sue state management
    - Create SueStore in Zustand
    - Track conversation, constraints, variety preferences
    - Track suggested/accepted/rejected recipes
    - _Requirements: 16.1, 16.4_

  - [x] 17.6 Implement Sue availability check
    - Check AI configuration
    - Hide Sue UI when AI disabled
    - _Requirements: 16.1, 16.6_

  - [x] 17.7 Write property test for Sue constraint filtering
    - **Property 16: Sue Constraint Filtering**
    - Test suggestions satisfy ALL specified constraints
    - **Validates: Requirements 16.2, 16.5**
    - **Status: PASSED** - All 10 tests pass

  - [x] 17.8 Write property test for Sue variety tracking
    - **Property 17: Sue Variety Tracking**
    - Test suggestions prioritize different cuisines/ingredients
    - **Validates: Requirements 16.3, 16.4**
    - **Status: PASSED** - All 6 tests pass

  - [x] 17.9 Write property test for Sue suggestion acceptance
    - **Property 18: Sue Suggestion Acceptance**
    - Test accepted suggestions add to menu correctly
    - **Validates: Requirements 16.4**
    - **Status: PASSED** - All 9 tests pass

  - [x] 17.10 Write property test for Sue availability
    - **Property 19: Sue Availability**
    - Test Sue available iff AI enabled, UI hidden when disabled
    - **Validates: Requirements 16.1, 16.6**
    - **Status: PASSED** - All 11 tests pass

- [x] 18. Planning Flow - Leftovers
  - [x] 18.1 Implement leftover tracking
    - Calculate expiry when recipe added to menu
    - Highlight recipes with expiring leftovers
    - Suggest available leftovers when planning
    - Allow marking meal as "leftovers from [recipe]"
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [x] 19. Checkpoint - Planning Flow Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Shopping Flow
  - [x] 20.1 Create Shopping View
    - Display shopping list with category grouping
    - Show progress indicator
    - Work fully offline
    - _Requirements: 18.1, 18.2, 18.3, 19.5_

  - [x] 20.2 Create Shopping List component
    - Consolidate ingredients from menu
    - Combine quantities for same ingredient
    - Show which recipes need each item
    - Show cook-by dates for time-sensitive items
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 20.3 Create Shopping Item component
    - Toggle checked state on tap
    - Show strikethrough and move to bottom when checked
    - Link to recipe on tap
    - _Requirements: 19.1, 19.2, 19.6_

  - [x] 20.4 Implement completion state
    - Show progress (e.g., "12 of 18 items")
    - Show completion message when all checked
    - _Requirements: 19.3, 19.4_

  - [x] 20.5 Create Custom Item form
    - Add non-recipe items
    - Assign category
    - Visually distinguish from recipe items
    - Allow deletion
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [x] 21. Cooking Flow - Cook Mode
  - [x] 21.1 Create Cooking View
    - Display today's menu items
    - Show recent recipes
    - Provide quick start to any recipe
    - Entry point for meal prep mode
    - _Requirements: 21.1, 21.4_

  - [x] 21.2 Create Cook Mode component
    - Display one instruction step at a time in large text
    - Implement swipe navigation between steps
    - Keep screen awake (Wake Lock API)
    - Show relevant ingredients for current step
    - _Requirements: 22.1, 22.3, 22.4, 22.5_

  - [x] 21.3 Create pre-cook configuration
    - Allow adjusting scale and units before starting
    - Capture configuration for session
    - _Requirements: 21.2, 21.3_

  - [x] 21.4 Add timer integration to Cook Mode
    - Detect timer-worthy steps
    - Offer timer start option
    - _Requirements: 22.6_

  - [x] 21.5 Add camera capture to Cook Mode
    - Camera button for capturing photos
    - Associate photos with current session
    - _Requirements: 22.8_

  - [x] 21.6 Add ingredient reference panel
    - Button to view all ingredients
    - Access substitutions from panel
    - _Requirements: 22.7_

- [x] 22. Cooking Flow - Session Logging
  - [x] 22.1 Create Cook Session Log component
    - Prompt when Cook Mode ends
    - Enter actual prep and cook times
    - Enter servings made and notes
    - Capture exact configuration used
    - _Requirements: 23.1, 23.2, 23.3, 23.4_

  - [x] 22.2 Allow logging without Cook Mode
    - Add "Log a Cook" action to Recipe Detail
    - Same form as post-Cook Mode
    - _Requirements: 23.5_

  - [x] 22.3 Update recipe statistics on log
    - Increment times cooked
    - Update average times
    - _Requirements: 23.6_

- [x] 23. Cooking Flow - Meal Prep Mode
  - [x] 23.1 Create Meal Prep Mode component
    - Select multiple recipes
    - Display consolidated prep tasks
    - Group tasks by shared ingredients
    - Show which recipes each task serves
    - _Requirements: 24.1, 24.2, 24.3, 24.4_

  - [x] 23.2 Implement task completion tracking
    - Checkable tasks
    - Show total time and progress
    - _Requirements: 24.5, 24.6_

  - [x] 23.3 Implement multi-recipe logging
    - Prompt for all recipes on completion
    - _Requirements: 24.7_

- [x] 24. Checkpoint - Shopping and Cooking Flows Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 25. Recipe Management
  - [ ] 25.1 Create Recipe Editor component
    - Manual entry with all recipe fields
    - Add/remove/reorder ingredients and instructions
    - Validate required fields (title, ingredients, instructions)
    - _Requirements: 25.1, 25.2, 25.3, 25.4_

  - [ ] 25.2 Create Recipe Import - URL
    - Enter URL and fetch/parse recipe
    - Display extracted data for review/edit
    - Show error with manual entry option on failure
    - _Requirements: 26.1, 26.2, 26.3_

  - [ ] 25.3 Create Recipe Import - Photo (AI)
    - Upload photo for AI extraction
    - Highlight low-confidence fields
    - Hide when AI disabled
    - _Requirements: 26.4, 26.5, 26.6_

  - [ ] 25.4 Create Folder Management
    - Display folders as navigable containers
    - Create, rename, delete folders
    - Move recipes between folders
    - Support nested folders
    - _Requirements: 27.1, 27.2, 27.3, 27.4_

  - [ ] 25.5 Implement folder export
    - Export folder with all contained recipes
    - _Requirements: 27.5_

- [x] 26. Statistics and Settings
  - [x] 26.1 Create Statistics View
    - Display total recipes, cook sessions, most-cooked
    - Display favorite tags and cuisines
    - Filter by time period
    - Show comparisons to previous periods
    - _Requirements: 28.1, 28.2, 28.3, 28.4_

  - [x] 26.2 Create Year in Review
    - Display total sessions, unique recipes, new recipes
    - Display top recipes and tags
    - Show monthly activity and streaks
    - Make shareable as image or PDF
    - _Requirements: 29.1, 29.2, 29.3_

  - [x] 26.3 Create Settings View
    - Default unit system and servings
    - Leftover duration setting
    - Theme (light/dark/system) and text size
    - AI provider configuration (when available)
    - _Requirements: 30.1, 30.2, 30.3_

  - [x] 26.4 Implement data management
    - Export all data (JSON)
    - Import data with validation and preview
    - Clear data option
    - _Requirements: 30.4_

- [x] 27. Export and Import
  - [x] 27.1 Create recipe export functionality
    - PDF export with formatted, printable document
    - JSON export with file download
    - _Requirements: 31.1, 31.2, 31.3_

  - [x] 27.2 Create recipe import functionality
    - File picker for JSON files
    - Validate and preview before saving
    - _Requirements: 31.4, 31.5_

  - [x] 27.3 Implement full data export/import
    - Available in Settings
    - Export all recipes, menus, sessions, preferences
    - _Requirements: 31.6_

- [x] 28. Accessibility
  - [x] 28.1 Add ARIA labels throughout
    - Label all interactive elements
    - Provide meaningful descriptions
    - _Requirements: 32.1_

  - [x] 28.2 Implement keyboard navigation
    - Tab order for all interactive elements
    - Keyboard shortcuts for common actions
    - _Requirements: 32.2_

  - [x] 28.3 Ensure color contrast compliance
    - WCAG AA contrast ratios
    - Don't rely solely on color
    - _Requirements: 32.3, 32.5_

  - [x] 28.4 Support text scaling
    - Test up to 200% text size
    - Ensure layouts don't break
    - _Requirements: 32.4_

- [-] 29. Performance Optimization
  - [x] 29.1 Implement lazy loading
    - Code split routes
    - Lazy load images
    - _Requirements: 33.5_

  - [x] 29.2 Implement list virtualization
    - Virtualize recipe library
    - Virtualize shopping list
    - _Requirements: 33.6_

  - [-] 29.3 Optimize for Lighthouse score
    - Target 90+ performance score
    - Initial load under 2 seconds on 3G
    - Search results within 100ms
    - View transitions within 300ms
    - _Requirements: 33.1, 33.2, 33.3, 33.4_

- [ ] 30. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify PWA installation works on iOS, Android, desktop
  - Verify offline functionality
  - Run Lighthouse audit

## Notes

- All tasks including property tests are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Core recipe components (tasks 5-10) are built early since they're used throughout the app
- Sue (task 17) has comprehensive property tests due to AI complexity
