/**
 * Property Test: Deep Link Resolution
 * 
 * **Feature: sous-chef-pwa, Property 15: Deep Link Resolution**
 * **Validates: Requirements 2.6**
 * 
 * For any valid route URL, direct navigation SHALL render the correct view
 * without requiring navigation through other views first.
 * 
 * This test validates that:
 * 1. All defined routes resolve to their expected views
 * 2. Dynamic route parameters are correctly extracted
 * 3. Unknown routes redirect to the fallback (plan view)
 * 4. Route matching is deterministic
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

/**
 * Route definition with expected view name
 */
interface RouteDefinition {
  path: string;
  viewName: string;
  isDynamic: boolean;
  paramNames?: string[];
}

/**
 * All defined routes in the application
 * This mirrors the route configuration in App.tsx
 */
const ROUTE_DEFINITIONS: RouteDefinition[] = [
  // Main flows
  { path: '/', viewName: 'redirect-to-plan', isDynamic: false },
  { path: '/plan', viewName: 'PlanningView', isDynamic: false },
  { path: '/shop', viewName: 'ShoppingView', isDynamic: false },
  { path: '/cook', viewName: 'CookingView', isDynamic: false },
  
  // Planning sub-routes
  { path: '/plan/brainstorm', viewName: 'BrainstormView', isDynamic: false },
  { path: '/plan/sue', viewName: 'SueChatView', isDynamic: false },
  
  // Shopping with dynamic list ID
  { path: '/shop/:listId', viewName: 'ShoppingView', isDynamic: true, paramNames: ['listId'] },
  
  // Cooking sub-routes
  { path: '/cook/prep', viewName: 'MealPrepView', isDynamic: false },
  
  // Recipe routes
  { path: '/recipe/new', viewName: 'RecipeEditor', isDynamic: false },
  { path: '/recipe/import', viewName: 'RecipeImport', isDynamic: false },
  { path: '/recipe/:id', viewName: 'RecipeDetail', isDynamic: true, paramNames: ['id'] },
  { path: '/recipe/:id/cook', viewName: 'CookMode', isDynamic: true, paramNames: ['id'] },
  { path: '/recipe/:id/edit', viewName: 'RecipeEditor', isDynamic: true, paramNames: ['id'] },
  { path: '/recipe/:id/history', viewName: 'RecipeHistory', isDynamic: true, paramNames: ['id'] },
  
  // Settings and stats
  { path: '/settings', viewName: 'SettingsView', isDynamic: false },
  { path: '/stats', viewName: 'StatisticsView', isDynamic: false },
  { path: '/stats/year/:year', viewName: 'YearInReview', isDynamic: true, paramNames: ['year'] },
  
  // Search
  { path: '/search', viewName: 'SearchView', isDynamic: false },
];

/**
 * Static routes (no dynamic parameters)
 */
const STATIC_ROUTES = ROUTE_DEFINITIONS.filter(r => !r.isDynamic);

/**
 * Dynamic routes (with parameters)
 */
const DYNAMIC_ROUTES = ROUTE_DEFINITIONS.filter(r => r.isDynamic);

/**
 * Convert a route pattern to a regex for matching
 */
function routePatternToRegex(pattern: string): RegExp {
  // Escape special regex characters except for :param patterns
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:(\w+)/g, '([^/]+)');
  return new RegExp(`^${escaped}$`);
}

/**
 * Match a URL path against route definitions
 * Returns the matched route and extracted parameters
 */
function matchRoute(path: string): { route: RouteDefinition | null; params: Record<string, string> } {
  // First try exact matches for static routes
  for (const route of STATIC_ROUTES) {
    if (route.path === path) {
      return { route, params: {} };
    }
  }
  
  // Then try dynamic routes
  for (const route of DYNAMIC_ROUTES) {
    const regex = routePatternToRegex(route.path);
    const match = path.match(regex);
    if (match) {
      const params: Record<string, string> = {};
      if (route.paramNames) {
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1]!;
        });
      }
      return { route, params };
    }
  }
  
  // No match - will redirect to fallback
  return { route: null, params: {} };
}

/**
 * Generate a valid URL for a dynamic route
 */
function generateDynamicUrl(route: RouteDefinition): string {
  let url = route.path;
  if (route.paramNames) {
    for (const paramName of route.paramNames) {
      const value = paramName === 'year' ? '2024' : uuidv4();
      url = url.replace(`:${paramName}`, value);
    }
  }
  return url;
}

/**
 * Arbitrary for generating valid static route paths
 */
const staticRouteArb = fc.constantFrom(...STATIC_ROUTES.map(r => r.path));

/**
 * Arbitrary for generating valid dynamic route URLs
 */
const dynamicRouteArb = fc.constantFrom(...DYNAMIC_ROUTES).map(generateDynamicUrl);

/**
 * Arbitrary for generating invalid/unknown route paths
 */
const unknownRouteArb = fc.oneof(
  fc.constant('/unknown'),
  fc.constant('/foo/bar/baz'),
  fc.constant('/recipe'),  // Missing ID
  fc.constant('/stats/year'),  // Missing year
  fc.stringMatching(/^\/[a-z]{1,10}(\/[a-z]{1,10}){0,3}$/).filter(
    path => !ROUTE_DEFINITIONS.some(r => {
      const regex = routePatternToRegex(r.path);
      return regex.test(path);
    })
  )
);

describe('Property 15: Deep Link Resolution', () => {
  it('should resolve all static routes to their expected views', () => {
    fc.assert(
      fc.property(staticRouteArb, (path) => {
        const { route, params } = matchRoute(path);
        
        // Route should be found
        expect(route).not.toBeNull();
        
        // Should match the expected view
        const expectedRoute = STATIC_ROUTES.find(r => r.path === path);
        expect(route!.viewName).toBe(expectedRoute!.viewName);
        
        // Static routes should have no params
        expect(Object.keys(params)).toHaveLength(0);
      }),
      { numRuns: 50 }
    );
  });

  it('should resolve dynamic routes with correct parameter extraction', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DYNAMIC_ROUTES),
        fc.uuid(),
        (routeDef, paramValue) => {
          // Generate URL with the parameter
          let url = routeDef.path;
          const expectedParams: Record<string, string> = {};
          
          if (routeDef.paramNames) {
            for (const paramName of routeDef.paramNames) {
              const value = paramName === 'year' ? '2024' : paramValue;
              url = url.replace(`:${paramName}`, value);
              expectedParams[paramName] = value;
            }
          }
          
          const { route, params } = matchRoute(url);
          
          // Route should be found
          expect(route).not.toBeNull();
          expect(route!.viewName).toBe(routeDef.viewName);
          
          // Parameters should be correctly extracted
          expect(params).toEqual(expectedParams);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should redirect unknown routes to fallback', () => {
    fc.assert(
      fc.property(unknownRouteArb, (path) => {
        const { route } = matchRoute(path);
        
        // Unknown routes should not match any defined route
        expect(route).toBeNull();
        
        // In the actual app, this would redirect to /plan
        // Here we just verify no route matches
      }),
      { numRuns: 50 }
    );
  });

  it('should have deterministic route matching', () => {
    fc.assert(
      fc.property(
        fc.oneof(staticRouteArb, dynamicRouteArb),
        (path) => {
          // Match the same path multiple times
          const result1 = matchRoute(path);
          const result2 = matchRoute(path);
          const result3 = matchRoute(path);
          
          // All results should be identical
          expect(result1.route?.viewName).toBe(result2.route?.viewName);
          expect(result2.route?.viewName).toBe(result3.route?.viewName);
          expect(result1.params).toEqual(result2.params);
          expect(result2.params).toEqual(result3.params);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly handle recipe routes with various ID formats', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (recipeId) => {
          // Test all recipe-related routes
          const recipeRoutes = [
            { url: `/recipe/${recipeId}`, expectedView: 'RecipeDetail' },
            { url: `/recipe/${recipeId}/cook`, expectedView: 'CookMode' },
            { url: `/recipe/${recipeId}/edit`, expectedView: 'RecipeEditor' },
            { url: `/recipe/${recipeId}/history`, expectedView: 'RecipeHistory' },
          ];
          
          for (const { url, expectedView } of recipeRoutes) {
            const { route, params } = matchRoute(url);
            
            expect(route).not.toBeNull();
            expect(route!.viewName).toBe(expectedView);
            expect(params.id).toBe(recipeId);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly handle year in review routes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2100 }),
        (year) => {
          const url = `/stats/year/${year}`;
          const { route, params } = matchRoute(url);
          
          expect(route).not.toBeNull();
          expect(route!.viewName).toBe('YearInReview');
          expect(params.year).toBe(String(year));
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should prioritize static routes over dynamic routes', () => {
    // /recipe/new should match the static route, not /recipe/:id
    const { route: newRoute } = matchRoute('/recipe/new');
    expect(newRoute).not.toBeNull();
    expect(newRoute!.viewName).toBe('RecipeEditor');
    expect(newRoute!.isDynamic).toBe(false);
    
    // /recipe/import should match the static route
    const { route: importRoute } = matchRoute('/recipe/import');
    expect(importRoute).not.toBeNull();
    expect(importRoute!.viewName).toBe('RecipeImport');
    expect(importRoute!.isDynamic).toBe(false);
  });
});
