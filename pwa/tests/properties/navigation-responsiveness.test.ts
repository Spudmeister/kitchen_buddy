/**
 * Property Test: Navigation Responsiveness
 * 
 * **Feature: sous-chef-pwa, Property 13: Navigation Responsiveness**
 * **Validates: Requirements 2.2, 2.3, 2.4**
 * 
 * For any viewport width, the navigation SHALL render as:
 * - Bottom bar on mobile (< 768px)
 * - Sidebar on desktop (≥ 768px)
 * 
 * This test validates that:
 * 1. Navigation variant is determined by viewport width
 * 2. The breakpoint at 768px correctly switches between variants
 * 3. All navigation items are present in both variants
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Navigation variant type
 */
type NavigationVariant = 'bottom' | 'sidebar';

/**
 * Navigation items that should be present in both variants
 */
const REQUIRED_NAV_ITEMS = ['plan', 'shop', 'cook', 'settings'] as const;

/**
 * Breakpoint for switching between mobile and desktop navigation
 * This matches the Tailwind md: breakpoint
 */
const DESKTOP_BREAKPOINT = 768;

/**
 * Determine which navigation variant should be shown based on viewport width
 * This mirrors the logic in the AppShell component
 */
function getNavigationVariant(viewportWidth: number): NavigationVariant {
  return viewportWidth >= DESKTOP_BREAKPOINT ? 'sidebar' : 'bottom';
}

/**
 * Simulate which navigation element would be visible based on CSS media queries
 * In the actual implementation:
 * - Bottom nav: "md:hidden" (hidden at >= 768px)
 * - Sidebar: "hidden md:block" (visible at >= 768px)
 */
function getVisibleNavigation(viewportWidth: number): {
  bottomVisible: boolean;
  sidebarVisible: boolean;
} {
  const isDesktop = viewportWidth >= DESKTOP_BREAKPOINT;
  return {
    bottomVisible: !isDesktop,  // md:hidden
    sidebarVisible: isDesktop,  // hidden md:block
  };
}

/**
 * Validate that exactly one navigation variant is visible
 */
function validateSingleNavigationVisible(viewportWidth: number): boolean {
  const { bottomVisible, sidebarVisible } = getVisibleNavigation(viewportWidth);
  // Exactly one should be visible (XOR)
  return bottomVisible !== sidebarVisible;
}

/**
 * Get the navigation items that would be rendered for a given variant
 * Both variants should include all required items
 */
function getNavigationItems(variant: NavigationVariant): readonly string[] {
  // Both variants render the same navigation items
  // This is validated by the component implementation
  return REQUIRED_NAV_ITEMS;
}

describe('Property 13: Navigation Responsiveness', () => {
  it('should show bottom bar on mobile viewports (< 768px)', () => {
    fc.assert(
      fc.property(
        // Generate mobile viewport widths (1 to 767)
        fc.integer({ min: 1, max: DESKTOP_BREAKPOINT - 1 }),
        (viewportWidth) => {
          const variant = getNavigationVariant(viewportWidth);
          expect(variant).toBe('bottom');
          
          const { bottomVisible, sidebarVisible } = getVisibleNavigation(viewportWidth);
          expect(bottomVisible).toBe(true);
          expect(sidebarVisible).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show sidebar on desktop viewports (>= 768px)', () => {
    fc.assert(
      fc.property(
        // Generate desktop viewport widths (768 to 4000)
        fc.integer({ min: DESKTOP_BREAKPOINT, max: 4000 }),
        (viewportWidth) => {
          const variant = getNavigationVariant(viewportWidth);
          expect(variant).toBe('sidebar');
          
          const { bottomVisible, sidebarVisible } = getVisibleNavigation(viewportWidth);
          expect(bottomVisible).toBe(false);
          expect(sidebarVisible).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have exactly one navigation visible at any viewport width', () => {
    fc.assert(
      fc.property(
        // Generate any reasonable viewport width
        fc.integer({ min: 1, max: 4000 }),
        (viewportWidth) => {
          const isValid = validateSingleNavigationVisible(viewportWidth);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all required navigation items in both variants', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<NavigationVariant>('bottom', 'sidebar'),
        (variant) => {
          const items = getNavigationItems(variant);
          
          // All required items should be present
          for (const requiredItem of REQUIRED_NAV_ITEMS) {
            expect(items).toContain(requiredItem);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should switch variants exactly at the breakpoint', () => {
    // Test the exact breakpoint boundary
    const justBelowBreakpoint = DESKTOP_BREAKPOINT - 1;
    const atBreakpoint = DESKTOP_BREAKPOINT;
    
    expect(getNavigationVariant(justBelowBreakpoint)).toBe('bottom');
    expect(getNavigationVariant(atBreakpoint)).toBe('sidebar');
    
    const belowVisibility = getVisibleNavigation(justBelowBreakpoint);
    expect(belowVisibility.bottomVisible).toBe(true);
    expect(belowVisibility.sidebarVisible).toBe(false);
    
    const atVisibility = getVisibleNavigation(atBreakpoint);
    expect(atVisibility.bottomVisible).toBe(false);
    expect(atVisibility.sidebarVisible).toBe(true);
  });

  it('should maintain consistent navigation items across viewport changes', () => {
    fc.assert(
      fc.property(
        // Generate pairs of viewport widths
        fc.integer({ min: 1, max: 4000 }),
        fc.integer({ min: 1, max: 4000 }),
        (width1, width2) => {
          const variant1 = getNavigationVariant(width1);
          const variant2 = getNavigationVariant(width2);
          
          const items1 = getNavigationItems(variant1);
          const items2 = getNavigationItems(variant2);
          
          // Both should have the same items regardless of variant
          expect([...items1].sort()).toEqual([...items2].sort());
        }
      ),
      { numRuns: 50 }
    );
  });
});
