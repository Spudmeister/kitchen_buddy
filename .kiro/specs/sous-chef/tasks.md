# Implementation Plan: Sous Chef

## Overview

This implementation plan breaks down the Sous Chef recipe management app into incremental tasks. Each task builds on previous work, with property-based tests validating correctness properties from the design. The implementation uses TypeScript with SQLite for local storage.

## Tasks

- [x] 1. Project setup and core infrastructure
  - [x] 1.1 Initialize TypeScript project with build configuration
    - Set up package.json, tsconfig.json, ESLint, Prettier
    - Configure Vitest for testing with fast-check for property-based tests
    - _Requirements: 9.1_
  - [x] 1.2 Set up SQLite database layer
    - Install better-sqlite3 or sql.js
    - Create database initialization and migration system
    - Implement WAL mode configuration
    - _Requirements: 9.1, 9.2_
  - [x] 1.3 Create base data types and interfaces
    - Define Recipe, Ingredient, Instruction, Duration types
    - Define Unit and UnitSystem types
    - _Requirements: 1.1, 2.1_
  - [x] 1.4 Write property test for database round-trip
    - **Property 1: Recipe Data Round-Trip Persistence**
    - **Validates: Requirements 1.1, 9.4**

- [x] 2. Recipe management core
  - [x] 2.1 Implement Recipe Service CRUD operations
    - createRecipe, getRecipe, updateRecipe, archiveRecipe
    - Implement version creation on update
    - _Requirements: 1.1, 1.2, 1.4_
  - [x] 2.2 Write property test for versioning
    - **Property 2: Recipe Versioning Preserves History**
    - **Validates: Requirements 1.2, 1.3**
  - [x] 2.3 Write property test for soft delete
    - **Property 3: Soft Delete Preserves Data**
    - **Validates: Requirements 1.4**
  - [x] 2.4 Implement version history and restoration
    - getVersionHistory, restoreRecipe
    - _Requirements: 1.3_
  - [x] 2.5 Implement recipe duplication with heritage
    - duplicateRecipe, getRecipeHeritage
    - Track parent_recipe_id relationships
    - _Requirements: 1.10, 1.11_
  - [x] 2.6 Write property test for duplication heritage
    - **Property 31: Recipe Duplication Preserves Heritage**
    - **Validates: Requirements 1.10, 1.11**

- [x] 3. Checkpoint - Core recipe management
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Unit conversion and scaling
  - [x] 4.1 Implement Unit Converter
    - Define conversion tables (US ↔ metric)
    - Implement convert, convertToSystem functions
    - _Requirements: 2.2_
  - [x] 4.2 Write property test for unit conversion round-trip
    - **Property 5: Unit Conversion Round-Trip**
    - **Validates: Requirements 2.2**
  - [x] 4.3 Implement recipe scaling
    - scaleRecipe, scaleIngredient functions
    - _Requirements: 2.1_
  - [x] 4.4 Write property test for scaling
    - **Property 4: Scaling Multiplies All Quantities**
    - **Validates: Requirements 2.1**
  - [x] 4.5 Implement practical rounding
    - roundToPractical function for cooking-friendly quantities
    - _Requirements: 2.4_
  - [x] 4.6 Write property test for practical rounding
    - **Property 7: Practical Rounding Produces Valid Measurements**
    - **Validates: Requirements 2.4**

- [x] 5. Tagging and search
  - [x] 5.1 Implement Tag Service
    - addTag, removeTag, getRecipesByTag, getAllTags
    - _Requirements: 3.1, 3.4_
  - [x] 5.2 Write property test for tag association
    - **Property 8: Tag Association Completeness**
    - **Validates: Requirements 3.1, 3.4**
  - [x] 5.3 Implement full-text search
    - Configure FTS5 virtual table
    - searchRecipes across title, ingredients, instructions, tags
    - _Requirements: 3.5_
  - [x] 5.4 Write property test for text search
    - **Property 9: Text Search Coverage**
    - **Validates: Requirements 3.5**
  - [x] 5.5 Implement dietary tag detection
    - detectDietaryTags based on ingredient analysis
    - Built-in categories: vegan, vegetarian, gluten-free, dairy-free, nut-free, low-carb
    - _Requirements: 3.7_

- [x] 6. Checkpoint - Recipe features complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Menu planning
  - [x] 7.1 Implement Menu Service CRUD
    - createMenu, getMenu, updateMenu, deleteMenu
    - _Requirements: 4.1, 4.5_
  - [x] 7.2 Implement menu assignments
    - assignRecipe, removeAssignment, moveAssignment
    - _Requirements: 4.1, 4.4_
  - [x] 7.3 Implement leftover date calculation
    - calculateLeftoverDate based on recipe/default duration
    - _Requirements: 4.3_
  - [x] 7.4 Write property test for leftover calculation
    - **Property 10: Leftover Date Calculation**
    - **Validates: Requirements 4.3, 4.4, 10.3**
  - [x] 7.5 Write property test for date range support
    - **Property 11: Menu Date Range Support**
    - **Validates: Requirements 4.5**

- [x] 8. Shopping list generation
  - [x] 8.1 Implement Shopping Service
    - generateFromMenu, generateFromRecipes
    - _Requirements: 5.1_
  - [x] 8.2 Implement ingredient consolidation
    - Combine same ingredients, sum quantities
    - _Requirements: 5.2_
  - [x] 8.3 Write property test for consolidation
    - **Property 12: Shopping List Ingredient Consolidation**
    - **Validates: Requirements 5.1, 5.2**
  - [x] 8.4 Implement category organization
    - Assign categories, group items
    - _Requirements: 5.4_
  - [x] 8.5 Write property test for category organization
    - **Property 13: Shopping List Category Organization**
    - **Validates: Requirements 5.4**
  - [x] 8.6 Implement check/uncheck functionality
    - checkItem, uncheckItem
    - _Requirements: 5.3_
  - [x] 8.7 Write property test for check state
    - **Property 14: Shopping Item Check State**
    - **Validates: Requirements 5.3**

- [x] 9. Checkpoint - Menu and shopping complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Meal prep mode
  - [x] 10.1 Implement meal prep plan generation
    - generateMealPrepPlan, analyze shared ingredients
    - _Requirements: 6.1, 6.2_
  - [x] 10.2 Write property test for ingredient consolidation
    - **Property 15: Meal Prep Ingredient Consolidation**
    - **Validates: Requirements 6.1, 6.2**
  - [x] 10.3 Implement prep task management
    - Task completion tracking
    - _Requirements: 6.4_
  - [x] 10.4 Write property test for task completion
    - **Property 16: Prep Task Completion State**
    - **Validates: Requirements 6.4**

- [x] 11. Statistics and ratings
  - [x] 11.1 Implement Statistics Service
    - logCookSession, getCookStats
    - _Requirements: 12.1, 12.2_
  - [x] 11.2 Write property test for cook session recording
    - **Property 21: Cook Session Recording**
    - **Validates: Requirements 12.1**
  - [x] 11.3 Write property test for statistics calculation
    - **Property 22: Cook Time Statistics Calculation**
    - **Validates: Requirements 12.2, 12.4**
  - [x] 11.4 Implement rating system
    - rateRecipe, getRatingHistory
    - _Requirements: 13.1, 13.5_
  - [x] 11.5 Write property test for rating storage
    - **Property 24: Rating Storage and Retrieval**
    - **Validates: Requirements 13.1**
  - [x] 11.6 Write property test for rating history
    - **Property 26: Rating History Tracking**
    - **Validates: Requirements 13.5**
  - [x] 11.7 Implement rating filter and sort
    - Filter by minimum rating, sort by rating
    - _Requirements: 13.3_
  - [x] 11.8 Write property test for rating filter
    - **Property 25: Rating Filter and Sort**
    - **Validates: Requirements 13.3**

- [x] 12. Personal statistics and year in review
  - [x] 12.1 Implement personal stats
    - getPersonalStats with period filtering
    - _Requirements: 14.1, 14.2_
  - [x] 12.2 Write property test for statistics tracking
    - **Property 29: Statistics Tracking Completeness**
    - **Validates: Requirements 14.1, 14.2, 14.4, 14.6**
  - [x] 12.3 Implement year in review
    - getYearInReview with comprehensive stats
    - _Requirements: 14.3_
  - [x] 12.4 Write property test for year in review
    - **Property 30: Year in Review Accuracy**
    - **Validates: Requirements 14.3**

- [x] 13. Checkpoint - Statistics complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Recommendations engine
  - [x] 14.1 Implement rule-based recommendations
    - getFavorites, getDeepCuts, getRecentlyAdded, getNotCookedRecently
    - _Requirements: 15.1, 15.2, 15.3, 15.5_
  - [x] 14.2 Write property test for favorites
    - **Property 27: Favorites Recommendation**
    - **Validates: Requirements 13.4, 15.2**
  - [x] 14.3 Write property test for deep cuts
    - **Property 28: Deep Cuts Recommendation**
    - **Validates: Requirements 15.3**
  - [x] 14.4 Implement filtered recommendations
    - getRecommendations with filters (time, tags, rating, ingredients)
    - _Requirements: 15.1_

- [x] 15. Substitution engine
  - [x] 15.1 Implement substitution suggestions
    - Substitution database with conversion ratios
    - _Requirements: 7.1, 7.3_
  - [x] 15.2 Implement recipe suggestions by ingredients
    - "What can I make with..." functionality
    - _Requirements: 7.2, 7.4_
  - [x] 15.3 Write property test for recipe suggestions
    - **Property 17: Recipe Suggestion by Ingredients**
    - **Validates: Requirements 7.2, 7.4**

- [x] 16. Checkpoint - Recommendations complete
  - Ensure all tests pass, ask the user if questions arise.


- [x] 17. Recipe photos and instances
  - [x] 17.1 Implement Photo Manager
    - addPhoto, getPhotos, getPhotosByInstance, deletePhoto
    - Support JPEG, PNG, HEIC, HEIF formats
    - _Requirements: 17.1, 17.4_
  - [x] 17.2 Write property test for photo format support
    - **Property 34: Photo Format Support**
    - **Validates: Requirements 17.4**
  - [x] 17.3 Write property test for multiple photos
    - **Property 35: Multiple Photos Per Recipe**
    - **Validates: Requirements 17.1, 17.5**
  - [x] 17.4 Implement Recipe Instance Service
    - createInstance, getInstance, getInstancesForRecipe, loadInstanceAsRecipe
    - _Requirements: 18.1, 18.2, 18.3_
  - [x] 17.5 Write property test for instance configuration
    - **Property 33: Recipe Instance Configuration Snapshot**
    - **Validates: Requirements 18.2, 18.3, 18.6**
  - [x] 17.6 Implement photo-instance association
    - Link photos to instances, navigate from photo to config
    - _Requirements: 17.2, 17.3, 18.4_
  - [x] 17.7 Write property test for photo-instance association
    - **Property 32: Photo-Instance Association**
    - **Validates: Requirements 17.2, 17.3, 18.4**

- [x] 18. Export and import
  - [x] 18.1 Implement JSON export
    - exportRecipe, exportFolder, exportAll
    - Include photos optionally
    - _Requirements: 8.2, 9.3, 9.8_
  - [x] 18.2 Implement JSON import
    - importRecipes with validation
    - _Requirements: 8.3, 9.9_
  - [x] 18.3 Write property test for export/import round-trip
    - **Property 18: Export/Import Round-Trip**
    - **Validates: Requirements 8.3, 9.9**
  - [x] 18.4 Write property test for folder export
    - **Property 19: Folder Export Completeness**
    - **Validates: Requirements 8.4, 9.8**
  - [x] 18.5 Implement PDF export
    - exportRecipeToPdf, exportMenuToPdf
    - _Requirements: 8.1_

- [x] 19. User preferences
  - [x] 19.1 Implement preferences storage
    - Get/set preferences, persist across sessions
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 19.2 Write property test for preference persistence
    - **Property 20: Preference Persistence**
    - **Validates: Requirements 10.4**
  - [x] 19.3 Write property test for unit preference
    - **Property 6: Unit Preference Consistency**
    - **Validates: Requirements 2.3, 10.1**
  - [x] 19.4 Implement menu time estimation with fallback
    - Use statistical averages when available
    - _Requirements: 12.5_
  - [x] 19.5 Write property test for time estimation fallback
    - **Property 23: Menu Time Estimation Fallback**
    - **Validates: Requirements 12.5**

- [x] 20. Checkpoint - Core features complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Recipe parsing (non-AI)
  - [x] 21.1 Implement schema.org parser
    - extractSchemaOrg from HTML
    - Support JSON-LD and Microdata formats
    - _Requirements: 1.5_
  - [x] 21.2 Implement URL fetching and parsing
    - parseFromUrl with schema.org extraction
    - _Requirements: 1.5, 1.7_
  - [x] 21.3 Implement ingredient normalization
    - Parse raw ingredient strings into structured data
    - _Requirements: 1.1_

- [x] 22. AI service abstraction
  - [x] 22.1 Implement AI Service interface
    - isEnabled, configure
    - Support OpenAI, Anthropic, Ollama providers
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x] 22.2 Implement secure API key storage
    - Encrypted storage in ai_config table
    - _Requirements: 11.5_
  - [x] 22.3 Implement AI-powered recipe parsing
    - parseRecipe for unstructured pages
    - _Requirements: 1.6_
  - [x] 22.4 Implement AI-powered tag suggestions
    - suggestTags with confidence scores
    - _Requirements: 3.2, 3.3_

- [x] 23. Visual recipe import
  - [x] 23.1 Implement Visual Parser
    - parseFromImage with AI extraction
    - Support JPEG, PNG, HEIC, HEIF, TIFF
    - _Requirements: 19.1, 19.2, 19.3_
  - [x] 23.2 Implement confidence reporting
    - Per-field confidence scores, low-confidence warnings
    - _Requirements: 19.4, 19.5_
  - [x] 23.3 Write property test for confidence reporting
    - **Property 36: Visual Parse Confidence Reporting**
    - **Validates: Requirements 19.4, 19.5**

- [x] 24. Menu Assistant (Sue)
  - [x] 24.1 Implement Menu Assistant chat interface
    - chat with recipe context
    - _Requirements: 16.1, 16.2_
  - [x] 24.2 Implement constraint filtering
    - Dietary restrictions, time, ingredients
    - _Requirements: 16.3_
  - [x] 24.3 Implement variety suggestions
    - Avoid repeating cuisines/ingredients
    - _Requirements: 16.4_
  - [x] 24.4 Implement suggestion acceptance
    - Add suggested recipes to menu
    - _Requirements: 16.5, 16.6_

- [x] 25. Checkpoint - AI features complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 26. Error handling and crash reproduction
  - [x] 26.1 Implement structured logging
    - ERROR, WARN, INFO, DEBUG levels
    - Context-rich log entries
    - _Requirements: Design - Error Handling_
  - [x] 26.2 Implement action logging
    - Track last 50 user actions for replay
    - _Requirements: Design - Crash Reproduction_
  - [x] 26.3 Implement crash report capture
    - captureState on error
    - Include pending operations, action log
    - _Requirements: Design - Crash Reproduction_
  - [x] 26.4 Implement crash report export/import
    - exportReport (anonymized), importReport
    - _Requirements: Design - Crash Reproduction_

- [x] 27. Test infrastructure
  - [x] 27.1 Create test fixtures
    - 50+ sample recipes, menus, sessions
    - Edge case coverage
    - _Requirements: Design - Testing Strategy_
  - [x] 27.2 Create mock implementations
    - AI service mock, database mock, photo manager mock
    - _Requirements: Design - Testing Strategy_
  - [x] 27.3 Create property test generators
    - Recipe, ingredient, menu, rating generators
    - _Requirements: Design - Testing Strategy_

- [x] 28. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all 36 correctness properties are tested
  - Review error handling coverage

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- AI features (tasks 22-24) can be deferred if focusing on core functionality first
