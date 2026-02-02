# Requirements Document

## Introduction

Sous Chef is a local-first recipe and grocery management application. It serves as a one-stop shop for importing, customizing, and versioning recipes, planning menus for any timeframe, and generating smart shopping lists. The app emphasizes flexibility with unit conversion, recipe scaling, and intelligent features like meal prep consolidation and leftover tracking.

## Glossary

- **Recipe_Manager**: The component responsible for storing, retrieving, versioning, and modifying recipes
- **Menu_Planner**: The component that organizes recipes into meal plans for specified date ranges
- **Shopping_List_Generator**: The component that creates consolidated shopping lists from menu plans
- **Unit_Converter**: The component that handles conversion between measurement systems (US/metric) and unit scaling
- **Recipe_Parser**: The component that extracts recipe data from external URLs
- **Tag_Engine**: The component that manages recipe categorization including auto-tagging
- **Substitution_Engine**: The component that suggests ingredient alternatives
- **Export_Service**: The component that generates shareable formats (PDF, app data format)
- **Menu_Assistant**: The AI-powered component (named "Sue") that helps users build menus through natural language interaction
- **Statistics_Tracker**: The component that records and analyzes cooking activity and usage patterns
- **Photo_Manager**: The component that handles recipe photos and their metadata
- **Recipe_Instance**: A specific occurrence of cooking a recipe, capturing the exact configuration (scale, units, notes) used
- **Visual_Parser**: The AI-powered component that extracts recipe data from photos of handwritten or printed recipes

## Requirements

### Requirement 1: Recipe Management

**User Story:** As a home cook, I want to import, create, and manage my recipes, so that I have a centralized collection of all my cooking knowledge.

#### Acceptance Criteria

1. WHEN a user creates a new recipe THEN the Recipe_Manager SHALL store the recipe with title, ingredients, instructions, prep time, cook time, and servings
2. WHEN a user edits a recipe THEN the Recipe_Manager SHALL create a new version while preserving the previous version
3. WHEN a user views recipe history THEN the Recipe_Manager SHALL display all versions with timestamps and allow restoration of any version
4. WHEN a user deletes a recipe THEN the Recipe_Manager SHALL mark it as archived rather than permanently removing it
5. WHEN a user imports a recipe from URL THEN the Recipe_Parser SHALL attempt to extract recipe data using structured data (schema.org) first
6. WHERE AI features are enabled THEN the Recipe_Parser SHALL use the configured AI provider to extract recipes from unstructured pages
7. WHEN the Recipe_Parser extracts a recipe THEN the Recipe_Parser SHALL present the extracted data for user review and approval before saving
8. WHEN a user reviews an extracted recipe THEN the Recipe_Parser SHALL allow editing of any field before accepting
9. IF the Recipe_Parser cannot extract recipe data THEN the Recipe_Parser SHALL display an error message and offer manual entry
10. WHEN a user duplicates a recipe THEN the Recipe_Manager SHALL create a new recipe with a reference to the parent recipe
11. WHEN viewing a duplicated recipe THEN the Recipe_Manager SHALL display the recipe heritage (parent and any ancestors)
12. WHEN a user creates a recipe manually THEN the Recipe_Manager SHALL provide a form for entering all recipe fields

### Requirement 2: Recipe Scaling and Unit Conversion

**User Story:** As a home cook, I want to scale recipes and convert between measurement systems, so that I can cook for any number of people using my preferred units.

#### Acceptance Criteria

1. WHEN a user requests to scale a recipe THEN the Unit_Converter SHALL multiply all ingredient quantities by the specified factor
2. WHEN a user switches between US and metric units THEN the Unit_Converter SHALL convert all measurements while maintaining accuracy
3. WHEN a user sets a default unit preference THEN the Recipe_Manager SHALL display all recipes in that unit system
4. WHEN scaling produces awkward quantities THEN the Unit_Converter SHALL round to practical cooking measurements
5. WHEN a recipe contains mixed units THEN the Unit_Converter SHALL handle each ingredient appropriately based on its type

### Requirement 3: Recipe Tagging and Search

**User Story:** As a home cook, I want to tag and search my recipes, so that I can quickly find what I'm looking for.

#### Acceptance Criteria

1. WHEN a user adds tags to a recipe THEN the Tag_Engine SHALL associate those tags with the recipe
2. WHERE AI features are enabled THEN the Tag_Engine SHALL auto-generate dietary tags based on ingredient analysis
3. WHEN auto-tags are generated THEN the Tag_Engine SHALL present them for user confirmation before applying
4. WHEN a user searches by tag THEN the Tag_Engine SHALL return all recipes matching the specified tags
5. WHEN a user searches by text THEN the Recipe_Manager SHALL search across title, ingredients, instructions, and tags
6. WHEN displaying search results THEN the Recipe_Manager SHALL show relevant metadata including prep time, tags, and last cooked date
7. THE Tag_Engine SHALL support built-in dietary categories including vegan, vegetarian, gluten-free, dairy-free, nut-free, and low-carb
8. WHERE AI features are disabled THEN the Tag_Engine SHALL allow manual tagging only

### Requirement 4: Menu Planning

**User Story:** As a home cook, I want to plan menus for any timeframe, so that I can organize my meals for the week, weekend, or any period.

#### Acceptance Criteria

1. WHEN a user creates a menu THEN the Menu_Planner SHALL allow assignment of recipes to specific dates and meal slots
2. WHEN a user views a menu THEN the Menu_Planner SHALL display recipes organized by date with cook dates and leftover dates
3. WHEN a recipe is added to a menu THEN the Menu_Planner SHALL calculate and display the leftover expiration date
4. WHEN a user drags a recipe to a different date THEN the Menu_Planner SHALL update the assignment and recalculate leftover dates
5. WHEN a menu spans multiple days THEN the Menu_Planner SHALL support any arbitrary date range

### Requirement 5: Shopping List Generation

**User Story:** As a home cook, I want to generate shopping lists from my menu, so that I know exactly what to buy.

#### Acceptance Criteria

1. WHEN a user generates a shopping list from a menu THEN the Shopping_List_Generator SHALL consolidate all ingredients from selected recipes
2. WHEN multiple recipes use the same ingredient THEN the Shopping_List_Generator SHALL combine quantities into a single line item
3. WHEN a user checks off an item THEN the Shopping_List_Generator SHALL mark it as purchased
4. WHEN displaying the shopping list THEN the Shopping_List_Generator SHALL organize items by category
5. WHEN a menu includes leftover dates THEN the Shopping_List_Generator SHALL display relevant cook-by information

### Requirement 6: Meal Prep Mode

**User Story:** As a home cook, I want to consolidate cooking steps when preparing multiple recipes, so that I can batch cook efficiently.

#### Acceptance Criteria

1. WHEN a user activates meal prep mode for selected recipes THEN the Menu_Planner SHALL analyze and group similar preparation steps
2. WHEN recipes share common ingredients THEN the Menu_Planner SHALL consolidate prep work for those ingredients
3. WHEN displaying meal prep instructions THEN the Menu_Planner SHALL present an optimized sequence of tasks
4. WHEN a user completes a prep step THEN the Menu_Planner SHALL mark it complete and update remaining tasks

### Requirement 7: Substitution and Brainstorm

**User Story:** As a home cook, I want suggestions for ingredient substitutions and ideas for using up random ingredients, so that I can reduce waste and adapt recipes.

#### Acceptance Criteria

1. WHEN a user requests substitutions for an ingredient THEN the Substitution_Engine SHALL provide alternative ingredients with conversion ratios
2. WHEN a user enters available ingredients THEN the Substitution_Engine SHALL suggest recipes that can be made with those ingredients
3. WHEN a substitution affects the recipe outcome THEN the Substitution_Engine SHALL note any expected differences
4. WHEN no exact recipe match exists THEN the Substitution_Engine SHALL suggest recipes with minimal missing ingredients

### Requirement 8: Sharing and Export

**User Story:** As a home cook, I want to share recipes and menus with others, so that I can collaborate with family and friends.

#### Acceptance Criteria

1. WHEN a user exports a recipe THEN the Export_Service SHALL generate a PDF with formatted recipe content
2. WHEN a user exports for app sharing THEN the Export_Service SHALL generate a portable data file in the app's format
3. WHEN a user imports a shared data file THEN the Recipe_Manager SHALL add the recipes to their collection
4. WHEN exporting a menu THEN the Export_Service SHALL include all associated recipes and the shopping list
5. THE Export_Service SHALL use a documented, versioned data format for app-to-app sharing

### Requirement 9: Data Format and Persistence

**User Story:** As a user, I want my data stored locally in a reliable format, so that I own my data and can back it up.

#### Acceptance Criteria

1. THE Recipe_Manager SHALL persist all data locally using SQLite for efficient querying at scale
2. THE Recipe_Manager SHALL support collections of thousands of recipes without performance degradation
3. THE Recipe_Manager SHALL use a documented JSON format for import/export and sharing
4. WHEN the app starts THEN the Recipe_Manager SHALL load existing data without data loss
5. WHEN data is modified THEN the Recipe_Manager SHALL save changes immediately
6. THE Recipe_Manager SHALL support data backup and restore operations
7. THE Recipe_Manager SHALL organize recipes into folders that can be shared independently
8. WHEN a user shares a folder THEN the Export_Service SHALL export all recipes in that folder as JSON
9. WHEN a user imports shared data THEN the Recipe_Manager SHALL parse the JSON and store in SQLite

### Requirement 10: User Preferences

**User Story:** As a user, I want to set my preferences for how the app displays information, so that it works the way I like.

#### Acceptance Criteria

1. WHEN a user sets a default unit system THEN the Recipe_Manager SHALL apply it to all recipe displays
2. WHEN a user sets default serving sizes THEN the Recipe_Manager SHALL use them when displaying recipes
3. WHEN a user configures leftover duration defaults THEN the Menu_Planner SHALL use them for new recipes
4. THE Recipe_Manager SHALL persist user preferences across sessions

### Requirement 11: AI Configuration

**User Story:** As a user, I want to optionally enable AI features with my choice of provider, so that I can use advanced features if I want while keeping the app free and lightweight by default.

#### Acceptance Criteria

1. THE app SHALL function fully without AI features enabled
2. WHEN a user enables AI features THEN the app SHALL require an API key configuration
3. THE app SHALL support multiple AI providers including cloud APIs and local models
4. WHEN a user configures a local AI model THEN the app SHALL use it without requiring external API calls
5. THE app SHALL store API keys securely in local configuration
6. WHEN AI features are disabled THEN the app SHALL hide AI-dependent UI elements
7. THE app SHALL clearly indicate which features require AI to be enabled

### Requirement 12: Cook Time Tracking and Statistics

**User Story:** As a home cook, I want to track actual cook times and see statistics, so that I can get more accurate time estimates based on real experience.

#### Acceptance Criteria

1. WHEN a user logs a cook session THEN the Recipe_Manager SHALL record the actual prep time and cook time
2. WHEN a recipe has multiple cook sessions logged THEN the Recipe_Manager SHALL calculate and display statistics including average, minimum, maximum, and range
3. WHEN displaying a recipe THEN the Recipe_Manager SHALL show both the original estimate and the statistical actual times
4. WHEN a user views cook time statistics THEN the Recipe_Manager SHALL display the number of times cooked and date of last cook
5. WHEN calculating menu time estimates THEN the Menu_Planner SHALL use statistical averages when available, falling back to recipe estimates

### Requirement 13: Recipe Ratings

**User Story:** As a home cook, I want to rate my recipes, so that I can remember which ones I loved and get better recommendations.

#### Acceptance Criteria

1. WHEN a user rates a recipe THEN the Recipe_Manager SHALL store the rating on a scale of 1-5 stars
2. WHEN a user views a recipe THEN the Recipe_Manager SHALL display the current rating if set
3. WHEN a user searches or browses recipes THEN the Recipe_Manager SHALL allow filtering and sorting by rating
4. WHEN generating recommendations THEN the Recipe_Manager SHALL use ratings to identify favorites and deep cuts
5. THE Recipe_Manager SHALL track rating history to show how opinions change over time

### Requirement 14: Personal Statistics and Year in Review

**User Story:** As a home cook, I want to see statistics about my cooking habits, so that I can reflect on my year and see trends.

#### Acceptance Criteria

1. THE Recipe_Manager SHALL track usage statistics including recipes cooked, total cook sessions, and features used
2. WHEN a user views personal statistics THEN the Recipe_Manager SHALL display total recipes cooked, most-cooked recipes, and favorite cuisines
3. WHEN a user requests a year in review THEN the Recipe_Manager SHALL generate a summary of cooking activity for the specified year
4. THE Recipe_Manager SHALL track statistics by time period to enable trend analysis
5. WHEN displaying statistics THEN the Recipe_Manager SHALL show comparisons to previous periods when available
6. THE Recipe_Manager SHALL track which tags and categories are most frequently cooked

### Requirement 15: Smart Recipe Recommendations

**User Story:** As a home cook, I want recipe recommendations based on my history and preferences, so that I can discover recipes I'll enjoy.

#### Acceptance Criteria

1. WHEN a user requests recommendations THEN the Recipe_Manager SHALL suggest recipes based on ratings, cook frequency, and tags
2. WHEN a user asks for favorites THEN the Recipe_Manager SHALL return highly-rated and frequently-cooked recipes
3. WHEN a user asks for deep cuts THEN the Recipe_Manager SHALL return recipes that are rated well but rarely cooked
4. WHERE AI features are enabled THEN the Menu_Assistant SHALL provide enhanced recommendations using natural language
5. WHERE AI features are disabled THEN the Recipe_Manager SHALL provide recommendations using rule-based filtering
6. WHEN generating recommendations THEN the Recipe_Manager SHALL consider seasonal ingredients and recent cooking history

### Requirement 16: Menu Assistant (Sue)

**User Story:** As a home cook, I want an AI assistant named Sue to help me build menus, so that I can get suggestions and inspiration based on my preferences and constraints.

#### Acceptance Criteria

1. WHERE AI features are enabled THEN the Menu_Assistant SHALL be available to help build menus
2. WHEN a user asks the Menu_Assistant for menu suggestions THEN the Menu_Assistant SHALL propose recipes from the user's collection based on stated preferences
3. WHEN a user specifies constraints THEN the Menu_Assistant SHALL filter suggestions by dietary restrictions, available time, or ingredients on hand
4. WHEN a user asks for variety THEN the Menu_Assistant SHALL avoid repeating cuisines or main ingredients across the menu
5. WHEN a user accepts a suggestion THEN the Menu_Assistant SHALL add the recipe to the menu at the specified slot
6. WHEN a user asks for alternatives THEN the Menu_Assistant SHALL provide different options meeting the same criteria
7. WHEN building a menu THEN the Menu_Assistant SHALL consider leftover utilization to minimize waste
8. WHERE AI features are disabled THEN the Menu_Assistant SHALL not be available

### Requirement 17: Recipe Photos

**User Story:** As a home cook, I want to attach photos to my recipes and cook sessions, so that I can visually document my cooking and remember how dishes turned out.

#### Acceptance Criteria

1. WHEN a user adds photos to a recipe THEN the Photo_Manager SHALL store multiple photos per recipe
2. WHEN a photo is added THEN the Photo_Manager SHALL store metadata including the associated recipe instance
3. WHEN viewing a photo THEN the Photo_Manager SHALL allow navigation to the exact recipe configuration (scale, units, notes) used when the photo was taken
4. THE Photo_Manager SHALL support common image formats including JPEG, PNG, HEIC, and HEIF
5. WHEN a user views a recipe THEN the Photo_Manager SHALL display associated photos organized by cook session
6. WHEN exporting a recipe THEN the Export_Service SHALL optionally include associated photos

### Requirement 18: Recipe Instances

**User Story:** As a home cook, I want to capture the exact configuration I used each time I cook a recipe, so that I can recreate successful variations.

#### Acceptance Criteria

1. WHEN a user logs a cook session THEN the Recipe_Manager SHALL create a Recipe_Instance capturing the exact configuration used
2. THE Recipe_Instance SHALL store the scale factor, unit system, serving count, and any notes or modifications
3. WHEN viewing a recipe instance THEN the Recipe_Manager SHALL display the recipe exactly as it was cooked (with applied scaling and units)
4. WHEN a photo is taken during cooking THEN the Photo_Manager SHALL associate it with the current Recipe_Instance
5. WHEN viewing cook history THEN the Recipe_Manager SHALL display all instances with their configurations and photos
6. WHEN a user wants to recreate a past cook THEN the Recipe_Manager SHALL allow loading a Recipe_Instance to restore that exact configuration

### Requirement 19: Visual Recipe Import

**User Story:** As a home cook, I want to import recipes from photos of handwritten or printed recipes, so that I can digitize my family recipes and cookbook pages.

#### Acceptance Criteria

1. WHERE AI features are enabled THEN the Visual_Parser SHALL be available for photo-based recipe import
2. WHEN a user uploads a photo of a recipe THEN the Visual_Parser SHALL use the configured AI provider to extract recipe data
3. THE Visual_Parser SHALL support common image formats including JPEG, PNG, HEIC, HEIF, and TIFF
4. WHEN the Visual_Parser extracts a recipe THEN the Visual_Parser SHALL present the extracted data for user review and approval
5. WHEN extraction quality is uncertain THEN the Visual_Parser SHALL highlight low-confidence fields for user attention
6. WHERE AI features are disabled THEN the Visual_Parser SHALL not be available and the option SHALL be hidden
