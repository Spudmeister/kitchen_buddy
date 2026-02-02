/**
 * Export Service - Handles recipe export to PDF and JSON formats
 *
 * Requirements: 31.1, 31.2, 31.3 - Export functionality
 */

import type { Recipe } from '../types/recipe';
import type { Duration } from '../types/units';

/**
 * Export options
 */
export interface ExportOptions {
  includePhotos?: boolean;
  includeCookSessions?: boolean;
  includeRatings?: boolean;
}

/**
 * Exported recipe format (JSON)
 */
export interface ExportedRecipe {
  id: string;
  title: string;
  description?: string;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
    category?: string;
  }[];
  instructions: {
    step: number;
    text: string;
    durationMinutes?: number;
    notes?: string;
  }[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  tags: string[];
  rating?: number;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Recipe export data structure
 */
export interface RecipeExportData {
  version: string;
  exportedAt: string;
  recipes: ExportedRecipe[];
}

const EXPORT_VERSION = '1.0.0';

/**
 * Format duration for display
 */
function formatDuration(duration: Duration): string {
  const minutes = duration.minutes;
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format quantity for display (handle fractions)
 */
function formatQuantity(quantity: number): string {
  if (quantity === 0) return '';

  const fractions: Record<number, string> = {
    0.25: '¼',
    0.33: '⅓',
    0.5: '½',
    0.67: '⅔',
    0.75: '¾',
  };

  const whole = Math.floor(quantity);
  const decimal = quantity - whole;

  for (const [value, symbol] of Object.entries(fractions)) {
    if (Math.abs(decimal - parseFloat(value)) < 0.05) {
      return whole > 0 ? `${whole} ${symbol}` : symbol;
    }
  }

  if (decimal === 0) return whole.toString();
  return quantity.toFixed(quantity < 10 ? 1 : 0);
}

/**
 * Convert recipe to exported format
 */
export function recipeToExported(recipe: Recipe): ExportedRecipe {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    ingredients: recipe.ingredients.map(ing => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      notes: ing.notes,
      category: ing.category,
    })),
    instructions: recipe.instructions.map(inst => ({
      step: inst.step,
      text: inst.text,
      durationMinutes: inst.duration?.minutes,
      notes: inst.notes,
    })),
    prepTimeMinutes: recipe.prepTime.minutes,
    cookTimeMinutes: recipe.cookTime.minutes,
    servings: recipe.servings,
    tags: recipe.tags,
    rating: recipe.rating,
    sourceUrl: recipe.sourceUrl,
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
  };
}

/**
 * Export a single recipe to JSON
 * Requirements: 31.2, 31.3 - JSON export with file download
 */
export function exportRecipeToJson(recipe: Recipe): void {
  const exportData: RecipeExportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    recipes: [recipeToExported(recipe)],
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${recipe.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export multiple recipes to JSON
 */
export function exportRecipesToJson(recipes: Recipe[], filename: string = 'recipes'): void {
  const exportData: RecipeExportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    recipes: recipes.map(recipeToExported),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF content for a recipe
 * Requirements: 31.1 - PDF export with formatted, printable document
 */
function generateRecipePdfContent(recipe: Recipe): string[] {
  const lines: string[] = [];

  // Title
  lines.push(`RECIPE: ${recipe.title}`);
  lines.push('');

  // Description
  if (recipe.description) {
    lines.push(recipe.description);
    lines.push('');
  }

  // Time and servings
  lines.push(`Prep Time: ${formatDuration(recipe.prepTime)}`);
  lines.push(`Cook Time: ${formatDuration(recipe.cookTime)}`);
  lines.push(`Total Time: ${formatDuration({ minutes: recipe.prepTime.minutes + recipe.cookTime.minutes })}`);
  lines.push(`Servings: ${recipe.servings}`);
  lines.push('');

  // Rating
  if (recipe.rating) {
    lines.push(`Rating: ${'★'.repeat(recipe.rating)}${'☆'.repeat(5 - recipe.rating)}`);
    lines.push('');
  }

  // Tags
  if (recipe.tags.length > 0) {
    lines.push(`Tags: ${recipe.tags.join(', ')}`);
    lines.push('');
  }

  // Ingredients
  lines.push('INGREDIENTS');
  lines.push('-'.repeat(40));
  for (const ing of recipe.ingredients) {
    const quantity = formatQuantity(ing.quantity);
    const notes = ing.notes ? ` (${ing.notes})` : '';
    lines.push(`  ${quantity} ${ing.unit} ${ing.name}${notes}`);
  }
  lines.push('');

  // Instructions
  lines.push('INSTRUCTIONS');
  lines.push('-'.repeat(40));
  for (const inst of recipe.instructions) {
    const duration = inst.duration ? ` (${formatDuration(inst.duration)})` : '';
    lines.push(`${inst.step}. ${inst.text}${duration}`);
    if (inst.notes) {
      lines.push(`   Note: ${inst.notes}`);
    }
    lines.push('');
  }

  // Source
  if (recipe.sourceUrl) {
    lines.push(`Source: ${recipe.sourceUrl}`);
  }

  return lines;
}

/**
 * Generate a simple PDF from text content
 * Creates a minimal valid PDF structure
 */
function generatePdf(lines: string[], _title: string): Uint8Array {
  const objects: string[] = [];
  let objectCount = 0;
  const objectOffsets: number[] = [];

  const addObject = (content: string): number => {
    objectCount++;
    objectOffsets.push(-1);
    objects.push(content);
    return objectCount;
  };

  // Object 1: Catalog
  addObject(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj`);

  // Object 2: Pages
  addObject(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj`);

  // Object 3: Page
  addObject(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj`);

  // Object 5: Font
  addObject(`5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>
endobj`);

  // Build content stream
  const contentLines: string[] = [];
  contentLines.push('BT');
  contentLines.push('/F1 10 Tf');
  
  let y = 750;
  const lineHeight = 12;
  const leftMargin = 50;
  const bottomMargin = 50;

  for (const line of lines) {
    if (y < bottomMargin) {
      break;
    }

    const escapedLine = line
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .substring(0, 80);

    contentLines.push(`1 0 0 1 ${leftMargin} ${y} Tm`);
    contentLines.push(`(${escapedLine}) Tj`);
    y -= lineHeight;
  }

  contentLines.push('ET');
  const contentStream = contentLines.join('\n');

  // Object 4: Content stream
  objects.splice(3, 0, `4 0 obj
<< /Length ${contentStream.length} >>
stream
${contentStream}
endstream
endobj`);

  // Build the PDF
  let pdf = '%PDF-1.4\n';
  
  for (let i = 0; i < objects.length; i++) {
    objectOffsets[i] = pdf.length;
    pdf += objects[i] + '\n';
  }

  // Cross-reference table
  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objectCount + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 0; i < objectCount; i++) {
    const offset = objectOffsets[i]!.toString().padStart(10, '0');
    pdf += `${offset} 00000 n \n`;
  }

  // Trailer
  pdf += 'trailer\n';
  pdf += `<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF';

  const encoder = new TextEncoder();
  return encoder.encode(pdf);
}

/**
 * Export a recipe to PDF format
 * Requirements: 31.1 - PDF export with formatted, printable document
 */
export function exportRecipeToPdf(recipe: Recipe): void {
  const content = generateRecipePdfContent(recipe);
  const pdfData = generatePdf(content, recipe.title);
  
  // Create a new ArrayBuffer from the Uint8Array for Blob compatibility
  const arrayBuffer = new ArrayBuffer(pdfData.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(pdfData);
  
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${recipe.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}


/**
 * Import validation error
 */
export interface ImportValidationError {
  field: string;
  message: string;
  recipeIndex?: number;
}

/**
 * Import result
 */
export interface ImportResult {
  recipesImported: number;
  recipesSkipped: number;
  errors: string[];
  importedRecipeIds: string[];
}

/**
 * Validate import data structure
 * Requirements: 31.5 - Validate data and show preview before saving
 */
export function validateImportData(data: unknown): ImportValidationError[] {
  const errors: ImportValidationError[] = [];

  if (!data || typeof data !== 'object') {
    errors.push({ field: 'root', message: 'Invalid data format' });
    return errors;
  }

  const exportData = data as RecipeExportData;

  // Check version
  if (!exportData.version) {
    errors.push({ field: 'version', message: 'Missing version field' });
  }

  // Check recipes array
  if (!Array.isArray(exportData.recipes)) {
    errors.push({ field: 'recipes', message: 'Recipes must be an array' });
    return errors;
  }

  // Validate each recipe
  for (let i = 0; i < exportData.recipes.length; i++) {
    const recipe = exportData.recipes[i];
    if (!recipe) {
      errors.push({ field: 'recipes', message: `Recipe at index ${i} is undefined`, recipeIndex: i });
      continue;
    }

    if (!recipe.title || typeof recipe.title !== 'string') {
      errors.push({ field: 'title', message: 'Missing or invalid title', recipeIndex: i });
    }

    if (!Array.isArray(recipe.ingredients)) {
      errors.push({ field: 'ingredients', message: 'Ingredients must be an array', recipeIndex: i });
    }

    if (!Array.isArray(recipe.instructions)) {
      errors.push({ field: 'instructions', message: 'Instructions must be an array', recipeIndex: i });
    }

    if (typeof recipe.servings !== 'number' || recipe.servings < 1) {
      errors.push({ field: 'servings', message: 'Servings must be a positive number', recipeIndex: i });
    }
  }

  return errors;
}

/**
 * Parse import file and return preview data
 * Requirements: 31.4, 31.5 - File picker for JSON files, validate and preview
 */
export function parseImportFile(fileContent: string): { data: RecipeExportData | null; errors: ImportValidationError[] } {
  try {
    const data = JSON.parse(fileContent) as RecipeExportData;
    const errors = validateImportData(data);
    
    if (errors.length > 0) {
      return { data: null, errors };
    }
    
    return { data, errors: [] };
  } catch (error) {
    return {
      data: null,
      errors: [{ field: 'root', message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}` }],
    };
  }
}

/**
 * Get import preview information
 */
export function getImportPreview(data: RecipeExportData): {
  recipesCount: number;
  recipes: { title: string; ingredientsCount: number; instructionsCount: number }[];
} {
  return {
    recipesCount: data.recipes.length,
    recipes: data.recipes.map(r => ({
      title: r.title,
      ingredientsCount: r.ingredients.length,
      instructionsCount: r.instructions.length,
    })),
  };
}
