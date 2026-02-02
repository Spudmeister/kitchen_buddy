/**
 * Unit Converter Service - Handles unit conversion and recipe scaling
 *
 * Provides conversion between US and metric units, recipe scaling,
 * and practical rounding for cooking-friendly quantities.
 *
 * Requirements: 2.1, 2.2, 2.4
 */
import type { Unit, UnitSystem } from '../types/units.js';
import type { Recipe, Ingredient, IngredientInput } from '../types/recipe.js';
/**
 * Unit Converter class for handling all unit conversions and scaling
 */
export declare class UnitConverter {
    /**
     * Convert a quantity from one unit to another
     * Requirements: 2.2 - Convert between US and metric units
     *
     * @param quantity - The quantity to convert
     * @param fromUnit - The source unit
     * @param toUnit - The target unit
     * @returns The converted quantity, or null if conversion is not possible
     */
    convert(quantity: number, fromUnit: Unit, toUnit: Unit): number | null;
    /**
     * Convert an ingredient to a target unit system
     * Requirements: 2.2 - Convert measurements while maintaining accuracy
     *
     * @param ingredient - The ingredient to convert
     * @param targetSystem - The target unit system ('us' or 'metric')
     * @returns A new ingredient with converted units, or the original if not convertible
     */
    convertToSystem(ingredient: Ingredient, targetSystem: UnitSystem): Ingredient;
    /**
     * Scale an ingredient by a factor
     * Requirements: 2.1 - Multiply ingredient quantities by scale factor
     *
     * @param ingredient - The ingredient to scale
     * @param factor - The scale factor (e.g., 2 for doubling)
     * @returns A new ingredient with scaled quantity
     */
    scaleIngredient(ingredient: Ingredient, factor: number): Ingredient;
    /**
     * Scale an ingredient input by a factor
     *
     * @param ingredient - The ingredient input to scale
     * @param factor - The scale factor
     * @returns A new ingredient input with scaled quantity
     */
    scaleIngredientInput(ingredient: IngredientInput, factor: number): IngredientInput;
    /**
     * Scale all ingredients in a recipe by a factor
     * Requirements: 2.1 - Multiply all ingredient quantities by specified factor
     *
     * @param recipe - The recipe to scale
     * @param factor - The scale factor
     * @returns A new recipe with all ingredients scaled
     */
    scaleRecipe(recipe: Recipe, factor: number): Recipe;
    /**
     * Round a quantity to a practical cooking measurement
     * Requirements: 2.4 - Round to practical cooking measurements
     *
     * @param quantity - The quantity to round
     * @param unit - The unit (affects rounding strategy)
     * @returns A practical cooking-friendly quantity
     */
    roundToPractical(quantity: number, unit: Unit): number;
    /**
     * Get the best unit for a quantity in a target system
     *
     * @param quantity - The original quantity
     * @param fromUnit - The original unit
     * @param targetSystem - The target unit system
     * @returns The best unit for the target system, or null if not convertible
     */
    private getBestUnitForSystem;
    /**
     * Check if two units are compatible for conversion
     *
     * @param unit1 - First unit
     * @param unit2 - Second unit
     * @returns True if the units can be converted between each other
     */
    areUnitsCompatible(unit1: Unit, unit2: Unit): boolean;
    /**
     * Get all units in a specific system
     *
     * @param system - The unit system
     * @returns Array of units in that system
     */
    getUnitsForSystem(system: UnitSystem): Unit[];
}
/**
 * Singleton instance for convenience
 */
export declare const unitConverter: UnitConverter;
//# sourceMappingURL=unit-converter.d.ts.map