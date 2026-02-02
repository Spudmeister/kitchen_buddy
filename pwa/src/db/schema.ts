/**
 * SQLite database schema for Sous Chef PWA
 * 
 * Adapted from the main Sous Chef schema for browser environment.
 * FTS (Full-Text Search) is excluded as it may not be supported in all sql.js builds.
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
-- Core tables
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  current_version INTEGER NOT NULL DEFAULT 1,
  folder_id TEXT REFERENCES folders(id),
  parent_recipe_id TEXT REFERENCES recipes(id),
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_versions (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER NOT NULL DEFAULT 4,
  source_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(recipe_id, version)
);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  recipe_version_id TEXT NOT NULL REFERENCES recipe_versions(id),
  name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  notes TEXT,
  category TEXT,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS instructions (
  id TEXT PRIMARY KEY,
  recipe_version_id TEXT NOT NULL REFERENCES recipe_versions(id),
  step_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  duration_minutes INTEGER,
  notes TEXT
);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  instance_id TEXT REFERENCES recipe_instances(id),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_path TEXT NOT NULL,
  taken_at TEXT,
  caption TEXT,
  step_number INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Recipe Instances (cook session configurations)
CREATE TABLE IF NOT EXISTS recipe_instances (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  recipe_version INTEGER NOT NULL,
  cook_session_id TEXT REFERENCES cook_sessions(id),
  scale_factor REAL NOT NULL DEFAULT 1.0,
  unit_system TEXT NOT NULL DEFAULT 'us',
  servings INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS instance_modifications (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL REFERENCES recipe_instances(id),
  ingredient_index INTEGER NOT NULL,
  original_quantity REAL,
  modified_quantity REAL,
  note TEXT
);

-- Tagging
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (recipe_id, tag_id)
);

-- Organization
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES folders(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Menu planning
CREATE TABLE IF NOT EXISTS menus (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_assignments (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL REFERENCES menus(id),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  date TEXT NOT NULL,
  meal_slot TEXT NOT NULL,
  servings INTEGER NOT NULL DEFAULT 4,
  cook_date TEXT NOT NULL,
  leftover_expiry_date TEXT,
  leftover_from_assignment_id TEXT REFERENCES menu_assignments(id),
  is_leftover INTEGER NOT NULL DEFAULT 0
);

-- Shopping
CREATE TABLE IF NOT EXISTS shopping_lists (
  id TEXT PRIMARY KEY,
  menu_id TEXT REFERENCES menus(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES shopping_lists(id),
  name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  category TEXT,
  checked INTEGER NOT NULL DEFAULT 0,
  cook_by_date TEXT
);

CREATE TABLE IF NOT EXISTS shopping_item_recipes (
  item_id TEXT NOT NULL REFERENCES shopping_items(id),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  PRIMARY KEY (item_id, recipe_id)
);

-- Statistics
CREATE TABLE IF NOT EXISTS cook_sessions (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  instance_id TEXT REFERENCES recipe_instances(id),
  date TEXT NOT NULL,
  actual_prep_minutes INTEGER,
  actual_cook_minutes INTEGER,
  servings_made INTEGER,
  notes TEXT
);

-- Meal Prep
CREATE TABLE IF NOT EXISTS meal_prep_plans (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meal_prep_plan_recipes (
  plan_id TEXT NOT NULL REFERENCES meal_prep_plans(id),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  PRIMARY KEY (plan_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS prep_tasks (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES meal_prep_plans(id),
  description TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  task_order INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  task_type TEXT NOT NULL,
  ingredient_name TEXT
);

CREATE TABLE IF NOT EXISTS prep_task_recipes (
  task_id TEXT NOT NULL REFERENCES prep_tasks(id),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  PRIMARY KEY (task_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  rated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Preferences
CREATE TABLE IF NOT EXISTS preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- AI Configuration (stored separately for security)
CREATE TABLE IF NOT EXISTS ai_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const CREATE_INDEXES_SQL = `
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipe_versions_recipe ON recipe_versions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_version ON ingredients(recipe_version_id);
CREATE INDEX IF NOT EXISTS idx_instructions_version ON instructions(recipe_version_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe ON recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag ON recipe_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_menu_assignments_menu ON menu_assignments(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_assignments_date ON menu_assignments(date);
CREATE INDEX IF NOT EXISTS idx_cook_sessions_recipe ON cook_sessions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cook_sessions_date ON cook_sessions(date);
CREATE INDEX IF NOT EXISTS idx_ratings_recipe ON ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_photos_recipe ON photos(recipe_id);
CREATE INDEX IF NOT EXISTS idx_photos_instance ON photos(instance_id);
CREATE INDEX IF NOT EXISTS idx_recipe_instances_recipe ON recipe_instances(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipes_parent ON recipes(parent_recipe_id);
CREATE INDEX IF NOT EXISTS idx_prep_tasks_plan ON prep_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_prep_plan_recipes_plan ON meal_prep_plan_recipes(plan_id);
CREATE INDEX IF NOT EXISTS idx_prep_task_recipes_task ON prep_task_recipes(task_id);
`;
