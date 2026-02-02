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
import { isVolumeUnit, isWeightUnit, getUnitSystem } from '../types/units.js';

/**
 * Conversion factors to a base unit within each category
 * Volume: base unit is ml
 * Weight: base unit is g
 */
const VOLUME_TO_ML: Record<string, number> = {
  // US Volume
  tsp: 4.92892,
  tbsp: 14.7868,
  fl_oz: 29.5735,
  cup: 236.588,
  pint: 473.176,
  quart: 946.353,
  gallon: 3785.41,
  // Metric Volume
  ml: 1,
  l: 1000,
};

const WEIGHT_TO_G: Record<string, number> = {
  // US Weight
  oz: 28.3495,
  lb: 453.592,
  // Metric Weight
  g: 1,
  kg: 1000,
};

/**
 * Preferred units for each system when converting
 */
const PREFERRED_VOLUME_UNITS: Record<UnitSystem, Unit[]> = {
  us: ['tsp', 'tbsp', 'cup', 'pint', 'quart', 'gallon'],
  metric: ['ml', 'l'],
};

const PREFERRED_WEIGHT_UNITS: Record<UnitSystem, Unit[]> = {
  us: ['oz', 'lb'],
  metric: ['g', 'kg'],
};

/**
 * Thresholds for choosing appropriate units (in base units)
 */
const VOLUME_THRESHOLDS_US: Array<{ max: number; unit: Unit }> = [
  { max: 14.7868, unit: 'tsp' },      // < 1 tbsp
  { max: 59.1471, unit: 'tbsp' },     // < 4 tbsp (1/4 cup)
  { max: 946.353, unit: 'cup' },      // < 1 quart
  { max: 3785.41, unit: 'quart' },    // < 1 gallon
  { max: Infinity, unit: 'gallon' },
];

const VOLUME_THRESHOLDS_METRIC: Array<{ max: number; unit: Unit }> = [
  { max: 1000, unit: 'ml' },
  { max: Infinity, unit: 'l' },
];

const WEIGHT_THRESHOLDS_US: Array<{ max: number; unit: Unit }> = [
  { max: 453.592, unit: 'oz' },       // < 1 lb
  { max: Infinity, unit: 'lb' },
];

const WEIGHT_THRESHOLDS_METRIC: Array<{ max: number; unit: Unit }> = [
  { max: 1000, unit: 'g' },
  { max: Infinity, unit: 'kg' },
];

/**
 * Practical fractions for cooking measurements
 */
const PRACTICAL_FRACTIONS = [
  0.125,  // 1/8
  0.25,   // 1/4
  0.333,  // 1/3
  0.5,    // 1/2
  0.667,  // 2/3
  0.75,   // 3/4
  1,
];

/**
 * Unit Converter class for handling all unit conversions and scaling
 */
export class UnitConverter {
  /**
   * Convert a quantity from one unit to another
   * Requirements: 2.2 - Convert between US and metric units
   *
   * @param quantity - The quantity to convert
   * @param fromUnit - The source unit
   * @param toUnit - The target unit
   * @returns The converted quantity, or null if conversion is not possible
   */
  convert(quantity: number, fromUnit: Unit, toUnit: Unit): number | null {
    // Same unit, no conversion needed
    if (fromUnit === toUnit) {
      return quantity;
    }

    // Check if both units are in the same category (volume or weight)
    const fromIsVolume = isVolumeUnit(fromUnit);
    const toIsVolume = isVolumeUnit(toUnit);
    const fromIsWeight = isWeightUnit(fromUnit);
    const toIsWeight = isWeightUnit(toUnit);

    // Cannot convert between volume and weight without density
    if (fromIsVolume !== toIsVolume || fromIsWeight !== toIsWeight) {
      return null;
    }

    // Handle volume conversions
    if (fromIsVolume && toIsVolume) {
      const fromFactor = VOLUME_TO_ML[fromUnit];
      const toFactor = VOLUME_TO_ML[toUnit];
      if (fromFactor === undefined || toFactor === undefined) {
        return null;
      }
      return (quantity * fromFactor) / toFactor;
    }

    // Handle weight conversions
    if (fromIsWeight && toIsWeight) {
      const fromFactor = WEIGHT_TO_G[fromUnit];
      const toFactor = WEIGHT_TO_G[toUnit];
      if (fromFactor === undefined || toFactor === undefined) {
        return null;
      }
      return (quantity * fromFactor) / toFactor;
    }

    // Non-convertible units (piece, dozen, pinch, dash, to_taste)
    return null;
  }

  /**
   * Convert an ingredient to a target unit system
   * Requirements: 2.2 - Convert measurements while maintaining accuracy
   *
   * @param ingredient - The ingredient to convert
   * @param targetSystem - The target unit system ('us' or 'metric')
   * @returns A new ingredient with converted units, or the original if not convertible
   */
  convertToSystem(ingredient: Ingredient, targetSystem: UnitSystem): Ingredient {
    const currentSystem = getUnitSystem(ingredient.unit);

    // Already in target system or non-convertible unit
    if (currentSystem === null || currentSystem === targetSystem) {
      return { ...ingredient };
    }

    // Determine the best target unit
    const targetUnit = this.getBestUnitForSystem(
      ingredient.quantity,
      ingredient.unit,
      targetSystem
    );

    if (targetUnit === null) {
      return { ...ingredient };
    }

    const convertedQuantity = this.convert(ingredient.quantity, ingredient.unit, targetUnit);

    if (convertedQuantity === null) {
      return { ...ingredient };
    }

    return {
      ...ingredient,
      quantity: convertedQuantity,
      unit: targetUnit,
    };
  }

  /**
   * Scale an ingredient by a factor
   * Requirements: 2.1 - Multiply ingredient quantities by scale factor
   *
   * @param ingredient - The ingredient to scale
   * @param factor - The scale factor (e.g., 2 for doubling)
   * @returns A new ingredient with scaled quantity
   */
  scaleIngredient(ingredient: Ingredient, factor: number): Ingredient {
    return {
      ...ingredient,
      quantity: ingredient.quantity * factor,
    };
  }

  /**
   * Scale an ingredient input by a factor
   *
   * @param ingredient - The ingredient input to scale
   * @param factor - The scale factor
   * @returns A new ingredient input with scaled quantity
   */
  scaleIngredientInput(ingredient: IngredientInput, factor: number): IngredientInput {
    return {
      ...ingredient,
      quantity: ingredient.quantity * factor,
    };
  }

  /**
   * Scale all ingredients in a recipe by a factor
   * Requirements: 2.1 - Multiply all ingredient quantities by specified factor
   *
   * @param recipe - The recipe to scale
   * @param factor - The scale factor
   * @returns A new recipe with all ingredients scaled
   */
  scaleRecipe(recipe: Recipe, factor: number): Recipe {
    return {
      ...recipe,
      ingredients: recipe.ingredients.map((ing) => this.scaleIngredient(ing, factor)),
      servings: Math.round(recipe.servings * factor),
    };
  }

  /**
   * Round a quantity to a practical cooking measurement
   * Requirements: 2.4 - Round to practical cooking measurements
   *
   * @param quantity - The quantity to round
   * @param unit - The unit (affects rounding strategy)
   * @returns A practical cooking-friendly quantity
   */
  roundToPractical(quantity: number, unit: Unit): number {
    // For very small quantities, keep more precision
    if (quantity < 0.125) {
      return Math.round(quantity * 100) / 100;
    }

    // For count units, round to nearest whole or half
    if (unit === 'piece' || unit === 'dozen') {
      return Math.round(quantity * 2) / 2;
    }

    // For special units, keep as-is
    if (unit === 'pinch' || unit === 'dash' || unit === 'to_taste') {
      return Math.round(quantity);
    }

    // For regular units, round to practical fractions
    const wholePart = Math.floor(quantity);
    const fractionalPart = quantity - wholePart;

    if (fractionalPart < 0.0625) {
      // Less than 1/16, round down to whole
      return wholePart;
    }

    // Find the closest practical fraction
    let closestFraction = 0;
    let minDiff = Infinity;

    for (const fraction of PRACTICAL_FRACTIONS) {
      const diff = Math.abs(fractionalPart - fraction);
      if (diff < minDiff) {
        minDiff = diff;
        closestFraction = fraction;
      }
    }

    // If closest is 1, add to whole part
    if (closestFraction === 1) {
      return wholePart + 1;
    }

    return wholePart + closestFraction;
  }

  /**
   * Get the best unit for a quantity in a target system
   *
   * @param quantity - The original quantity
   * @param fromUnit - The original unit
   * @param targetSystem - The target unit system
   * @returns The best unit for the target system, or null if not convertible
   */
  private getBestUnitForSystem(
    quantity: number,
    fromUnit: Unit,
    targetSystem: UnitSystem
  ): Unit | null {
    const isVolume = isVolumeUnit(fromUnit);
    const isWeight = isWeightUnit(fromUnit);

    if (!isVolume && !isWeight) {
      return null;
    }

    // Convert to base unit (ml or g)
    let baseQuantity: number;
    if (isVolume) {
      const factor = VOLUME_TO_ML[fromUnit];
      if (factor === undefined) return null;
      baseQuantity = quantity * factor;
    } else {
      const factor = WEIGHT_TO_G[fromUnit];
      if (factor === undefined) return null;
      baseQuantity = quantity * factor;
    }

    // Select appropriate thresholds based on type and target system
    let thresholds: Array<{ max: number; unit: Unit }>;
    if (isVolume) {
      thresholds = targetSystem === 'us' ? VOLUME_THRESHOLDS_US : VOLUME_THRESHOLDS_METRIC;
    } else {
      thresholds = targetSystem === 'us' ? WEIGHT_THRESHOLDS_US : WEIGHT_THRESHOLDS_METRIC;
    }

    // Find the appropriate unit based on quantity
    for (const threshold of thresholds) {
      if (baseQuantity < threshold.max) {
        return threshold.unit;
      }
    }

    // Fallback to the last unit in thresholds
    return thresholds[thresholds.length - 1]?.unit ?? null;
  }

  /**
   * Check if two units are compatible for conversion
   *
   * @param unit1 - First unit
   * @param unit2 - Second unit
   * @returns True if the units can be converted between each other
   */
  areUnitsCompatible(unit1: Unit, unit2: Unit): boolean {
    if (unit1 === unit2) return true;

    const unit1IsVolume = isVolumeUnit(unit1);
    const unit2IsVolume = isVolumeUnit(unit2);
    const unit1IsWeight = isWeightUnit(unit1);
    const unit2IsWeight = isWeightUnit(unit2);

    return (unit1IsVolume && unit2IsVolume) || (unit1IsWeight && unit2IsWeight);
  }

  /**
   * Get all units in a specific system
   *
   * @param system - The unit system
   * @returns Array of units in that system
   */
  getUnitsForSystem(system: UnitSystem): Unit[] {
    return [...PREFERRED_VOLUME_UNITS[system], ...PREFERRED_WEIGHT_UNITS[system]];
  }
}

/**
 * Singleton instance for convenience
 */
export const unitConverter = new UnitConverter();
