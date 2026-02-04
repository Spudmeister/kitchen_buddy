# AGENTS.md - Sous Chef Development Guidelines

This document provides guidance for AI agents and developers working on the Sous Chef codebase.

## Project Overview

Sous Chef is a local-first recipe and grocery management application with two main components:
- **Core Library** (`src/`) - TypeScript services, repositories, and types
- **PWA Frontend** (`pwa/`) - React Progressive Web App with offline support

## Architecture

```
sous-chef/
├── src/                    # Core library (Node.js + sql.js)
│   ├── db/                 # Database layer (SQLite via sql.js)
│   ├── repositories/       # Data access layer
│   ├── services/           # Business logic
│   └── types/              # TypeScript type definitions
├── pwa/                    # Progressive Web App (React)
│   ├── src/
│   │   ├── components/     # React components (organized by feature)
│   │   ├── db/             # Browser database (sql.js + IndexedDB)
│   │   ├── hooks/          # React Query hooks
│   │   ├── routes/         # Page components
│   │   ├── services/       # Browser-adapted services
│   │   ├── stores/         # Zustand state stores
│   │   └── types/          # PWA-specific types
│   └── tests/              # PWA tests
└── tests/                  # Core library tests
```

## Code Style & Conventions

### TypeScript

- Strict mode enabled (`strict: true`)
- Use explicit return types on functions
- Prefer interfaces over type aliases for object shapes
- Use `type` imports for type-only imports
- Avoid `any` - use `unknown` when type is truly unknown

```typescript
// Good
import type { Recipe, RecipeInput } from '../types/recipe.js';

export function createRecipe(input: RecipeInput): Recipe {
  // ...
}

// Avoid
import { Recipe } from '../types/recipe.js';  // Missing 'type'
export function createRecipe(input: any) {    // Using 'any'
```

### File Extensions

- Use `.js` extension in imports (TypeScript compiles to ESM)
- Use `.tsx` for React components, `.ts` for everything else

```typescript
// Correct
import { RecipeService } from './services/recipe-service.js';

// Incorrect
import { RecipeService } from './services/recipe-service';
```

### Naming Conventions

- **Files**: kebab-case (`recipe-service.ts`, `use-recipes.ts`)
- **Components**: PascalCase (`RecipeCard.tsx`, `QuickActionsMenu.tsx`)
- **Types/Interfaces**: PascalCase (`Recipe`, `RecipeInput`)
- **Functions/Variables**: camelCase (`createRecipe`, `recipeService`)
- **Constants**: SCREAMING_SNAKE_CASE for true constants (`ALL_UNITS`)

### Documentation

- Use JSDoc comments for public APIs
- Include `@param` and `@returns` for functions
- Reference requirements where applicable

```typescript
/**
 * Scale an ingredient by a factor
 * Requirements: 2.1 - Multiply ingredient quantities by scale factor
 *
 * @param ingredient - The ingredient to scale
 * @param factor - The scale factor (e.g., 2 for doubling)
 * @returns A new ingredient with scaled quantity
 */
scaleIngredient(ingredient: Ingredient, factor: number): Ingredient {
```

## Service Layer Pattern

Services encapsulate business logic and database operations:

```typescript
export class RecipeService {
  constructor(private db: Database) {}

  // Public methods for business operations
  createRecipe(input: RecipeInput): Recipe { }
  getRecipe(id: string): Recipe | undefined { }
  updateRecipe(id: string, input: RecipeInput): Recipe { }
  archiveRecipe(id: string): void { }

  // Private helpers for internal operations
  private insertIngredients(versionId: string, ingredients: IngredientInput[]): void { }
}
```

## React Patterns (PWA)

### Component Structure

```typescript
/**
 * Component description
 * Requirements: X.Y
 */

// Props interface
export interface ComponentProps {
  prop: Type;
  onAction?: (value: Type) => void;
}

// Component
export function Component({ prop, onAction }: ComponentProps) {
  // Hooks first
  const [state, setState] = useState();
  const navigate = useNavigate();

  // Callbacks
  const handleAction = useCallback(() => {
    // ...
  }, [dependencies]);

  // Render
  return (
    <div>...</div>
  );
}
```

### React Query Hooks

Data fetching uses React Query with consistent key patterns:

```typescript
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  detail: (id: string) => [...recipeKeys.all, 'detail', id] as const,
};

export function useRecipe(id: string) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => getRecipeService().getRecipe(id),
    enabled: !!id,
  });
}
```

### State Management

- **React Query**: Server/data state (recipes, menus, etc.)
- **Zustand**: UI state (modals, toasts, preferences)

```typescript
// Zustand store pattern
interface UIState {
  activeTab: 'plan' | 'shop' | 'cook';
  setActiveTab: (tab: UIState['activeTab']) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'plan',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
```

## Testing

### Property-Based Testing

Use fast-check for property-based tests. Tests validate correctness properties:

```typescript
/**
 * Property Test: Scaling Multiplies All Quantities
 * **Validates: Requirements 2.1**
 */
describe('Property: Scaling Multiplies All Quantities', () => {
  it('should multiply each ingredient quantity by exactly the scale factor', () => {
    fc.assert(
      fc.property(recipeInputArb, scaleFactorArb, (input, factor) => {
        const recipe = createRecipe(input);
        const scaled = scaleRecipe(recipe, factor);

        for (let i = 0; i < recipe.ingredients.length; i++) {
          expect(scaled.ingredients[i].quantity)
            .toBeCloseTo(recipe.ingredients[i].quantity * factor);
        }
      }),
      { numRuns: 100 }
    );
  });
});
```

### Test Generators

Reusable generators in `tests/generators/`:

```typescript
export const ingredientInputArb: fc.Arbitrary<IngredientInput> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  quantity: fc.double({ min: 0.01, max: 1000, noNaN: true }),
  unit: unitArb,
  notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
});
```

### Test Organization

```
tests/
├── fixtures/           # Test data factories
├── generators/         # fast-check generators
├── mocks/              # Service mocks
├── properties/         # Property-based tests
├── services/           # Unit tests for services
└── integration/        # Integration tests
```

## Database

### Schema

SQLite database with versioned recipes:
- `recipes` - Recipe metadata
- `recipe_versions` - Immutable version snapshots
- `ingredients` - Linked to recipe versions
- `instructions` - Linked to recipe versions
- `tags`, `recipe_tags` - Tag associations

### Transactions

Use transactions for multi-statement operations:

```typescript
return this.db.transaction(() => {
  this.db.run('INSERT INTO recipes ...', [...]);
  this.db.run('INSERT INTO recipe_versions ...', [...]);
  this.insertIngredients(versionId, input.ingredients);
  return this.getRecipe(recipeId)!;
});
```

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- WCAG AA color contrast
- Screen reader compatibility

```tsx
<button
  aria-label="Recipe actions"
  aria-haspopup="menu"
  aria-expanded={menuOpen}
>
```

## Error Handling

- Use specific error messages
- Throw errors for invalid operations
- Return `undefined` for not-found cases

```typescript
getRecipe(id: string): Recipe | undefined {
  // Returns undefined if not found
}

updateRecipe(id: string, input: RecipeInput): Recipe {
  if (!this.exists(id)) {
    throw new Error(`Recipe not found: ${id}`);
  }
}
```

## Commands

```bash
# Install dependencies
npm run install:all

# Development
npm run dev              # Start PWA dev server

# Testing
npm test                 # Run all tests
npm run test:lib         # Core library tests only
npm run test:app         # PWA tests only

# Building
npm run build            # Build everything
npm run build:lib        # Build core library
npm run build:app        # Build PWA

# Code Quality
npm run lint             # ESLint
npm run format           # Prettier
```

## Spec-Driven Development

Features are developed using specs in `.kiro/specs/`:

```
.kiro/specs/{feature-name}/
├── requirements.md      # User stories and acceptance criteria
├── design.md            # Technical design with correctness properties
└── tasks.md             # Implementation task list
```

### Requirements Format

```markdown
### Requirement N: Feature Name

**User Story:** As a user, I want to [action] so that [benefit].

#### Acceptance Criteria

1. THE system SHALL [behavior]
2. WHEN [condition] THEN [result]
3. WHERE [context] THEN [behavior]
```

### Correctness Properties

Properties are formal statements that must hold true:

```markdown
### Property N: Property Name

*For any* [input conditions], [operation] SHALL [expected behavior].

**Validates: Requirements X.Y, X.Z**
```

## Key Patterns to Follow

1. **Immutable Versioning**: Recipe edits create new versions, never overwrite
2. **Soft Delete**: Archive records instead of permanent deletion
3. **Heritage Tracking**: Duplicated recipes link to their parent
4. **Offline-First**: All data stored locally, works without network
5. **Practical Rounding**: Scale to cooking-friendly measurements (1/4, 1/3, 1/2, etc.)
6. **Unit Conversion**: Support US ↔ Metric with round-trip accuracy within 1%
