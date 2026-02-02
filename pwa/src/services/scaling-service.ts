/**
 * Scaling Service for PWA
 *
 * Handles recipe scaling with practical rounding for cooking-friendly quantities.
 * Provides unit conversion between US and metric systems.
 *
 * Requirements: 5.2, 5.3, 5.4, 5.5
 */

import type { Unit, UnitSystem } from '../types/units';
import type { Ingredient } from '../types/recipe';

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
 * Conversion factors to base units
 * Volume: base unit is ml
 * Weight: base unit is g
 */
const VOLUME_TO_ML: Record<string, number> = {
  tsp: 4.92892,
  tbsp: 14.7868,
  fl_oz: 29.5735,
  cup: 236.588,
  pint: 473.176,
  quart: 946.353,
  gallon: 3785.41,
  ml: 1,
  l: 1000,
};

const WEIGHT_TO_G: Record<string, number> = {
  oz: 28.3495,
  lb: 453.592,
  g: 1,
  kg: 1000,
};

/**
 * Volume units
 */
const VOLUME_UNITS: Unit[] = ['tsp', 'tbsp', 'fl_oz', 'cup', 'pint', 'quart', 'gallon', 'ml', 'l'];

/**
 * Weight units
 */
const WEIGHT_UNITS: Unit[] = ['oz', 'lb', 'g', 'kg'];

/**
 * US units
 */
const US_UNITS: Unit[] = ['tsp', 'tbsp', 'fl_oz', 'cup', 'pint', 'quart', 'gallon', 'oz', 'lb'];

/**
 * Metric units
 */
const METRIC_UNITS: Unit[] = ['ml', 'l', 'g', 'kg'];

/**
 * Thresholds for choosing appropriate units (in base units)
 */
const VOLUME_THRESHOLDS_US: Array<{ max: number; unit: Unit }> = [
  { max: 14.7868, unit: 'tsp' },
  { max: 59.1471, unit: 'tbsp' },
  { max: 946.353, unit: 'cup' },
  { max: 3785.41, unit: 'quart' },
  { max: Infinity, unit: 'gallon' },
];

const VOLUME_THRESHOLDS_METRIC: Array<{ max: number; unit: Unit }> = [
  { max: 1000, unit: 'ml' },
  { max: Infinity, unit: 'l' },
];

const WEIGHT_THRESHOLDS_US: Array<{ max: number; unit: Unit }> = [
  { max: 453.592, unit: 'oz' },
  { max: Infinity, unit: 'lb' },
];

const WEIGHT_THRESHOLDS_METRIC: Array<{ max: number; unit: Unit }> = [
  { max: 1000, unit: 'g' },
  { max: Infinity, unit: 'kg' },
];

/**
 * Check if a unit is a volume unit
 */
export function isVolumeUnit(unit: Unit): boolean {
  return VOLUME_UNITS.includes(unit);
}

/**
 * Check if a unit is a weight unit
 */
export function isWeightUnit(unit: Unit): boolean {
  return WEIGHT_UNITS.includes(unit);
}

/**
 * Get the unit system for a unit
 */
export function getUnitSystem(unit: Unit): UnitSystem | null {
  if (US_UNITS.includes(unit)) return 'us';
  if (METRIC_UNITS.includes(unit)) return 'metric';
  return null;
}

/**
 * Round a quantity to a practical cooking measurement
 * Requirements: 5.4 - Round to practical cooking measurements
 */
export function roundToPractical(quantity: number, unit: Unit): number {
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

  if (closestFraction === 1) {
    return wholePart + 1;
  }

  return wholePart + closestFraction;
}

/**
 * Scale an ingredient by a factor
 * Requirements: 5.2 - Multiply ingredient quantities by scale factor
 */
export function scaleIngredient(ingredient: Ingredient, factor: number): Ingredient {
  const scaledQuantity = ingredient.quantity * factor;
  const roundedQuantity = roundToPractical(scaledQuantity, ingredient.unit);
  
  return {
    ...ingredient,
    quantity: roundedQuantity,
  };
}

/**
 * Scale all ingredients by a factor
 */
export function scaleIngredients(ingredients: Ingredient[], factor: number): Ingredient[] {
  return ingredients.map(ing => scaleIngredient(ing, factor));
}

/**
 * Convert a quantity from one unit to another
 */
export function convert(quantity: number, fromUnit: Unit, toUnit: Unit): number | null {
  if (fromUnit === toUnit) {
    return quantity;
  }

  const fromIsVolume = isVolumeUnit(fromUnit);
  const toIsVolume = isVolumeUnit(toUnit);
  const fromIsWeight = isWeightUnit(fromUnit);
  const toIsWeight = isWeightUnit(toUnit);

  // Cannot convert between volume and weight
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

  return null;
}

/**
 * Get the best unit for a quantity in a target system
 */
function getBestUnitForSystem(
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

  // Select appropriate thresholds
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

  return thresholds[thresholds.length - 1]?.unit ?? null;
}

/**
 * Convert an ingredient to a target unit system
 * Requirements: 5.3, 5.5 - Convert between US and metric
 */
export function convertIngredientToSystem(
  ingredient: Ingredient,
  targetSystem: UnitSystem
): Ingredient {
  const currentSystem = getUnitSystem(ingredient.unit);

  // Already in target system or non-convertible unit
  if (currentSystem === null || currentSystem === targetSystem) {
    return { ...ingredient };
  }

  // Determine the best target unit
  const targetUnit = getBestUnitForSystem(
    ingredient.quantity,
    ingredient.unit,
    targetSystem
  );

  if (targetUnit === null) {
    return { ...ingredient };
  }

  const convertedQuantity = convert(ingredient.quantity, ingredient.unit, targetUnit);

  if (convertedQuantity === null) {
    return { ...ingredient };
  }

  return {
    ...ingredient,
    quantity: roundToPractical(convertedQuantity, targetUnit),
    unit: targetUnit,
  };
}

/**
 * Convert all ingredients to a target unit system
 */
export function convertIngredientsToSystem(
  ingredients: Ingredient[],
  targetSystem: UnitSystem
): Ingredient[] {
  return ingredients.map(ing => convertIngredientToSystem(ing, targetSystem));
}
