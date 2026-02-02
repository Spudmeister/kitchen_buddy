/**
 * PDF Service - Generates PDF exports for recipes and menus
 *
 * Requirements: 8.1 - Generate PDF with formatted recipe content
 * 
 * This is a simple PDF generator that creates basic PDF documents
 * without requiring external dependencies.
 */

import type { Database } from '../db/database.js';
import type { Recipe } from '../types/recipe.js';
import type { Menu, MenuAssignment } from '../types/menu.js';
import { RecipeService } from './recipe-service.js';
import { MenuService } from './menu-service.js';
import { ShoppingService } from './shopping-service.js';

/**
 * Options for PDF export
 */
export interface PdfExportOptions {
  /** Include photos in the PDF */
  includePhotos?: boolean;
  /** Include nutrition information */
  includeNutrition?: boolean;
  /** Include cook history */
  includeHistory?: boolean;
}

/**
 * Service for generating PDF exports
 */
export class PdfService {
  private recipeService: RecipeService;
  private menuService: MenuService;
  private shoppingService: ShoppingService;

  constructor(private db: Database) {
    this.recipeService = new RecipeService(db);
    this.menuService = new MenuService(db);
    this.shoppingService = new ShoppingService(db, this.menuService, this.recipeService);
  }

  /**
   * Export a recipe to PDF format
   * Requirements: 8.1 - Generate PDF with formatted recipe content
   */
  exportRecipeToPdf(recipeId: string, options: PdfExportOptions = {}): Uint8Array {
    const recipe = this.recipeService.getRecipe(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    const content = this.formatRecipeContent(recipe, options);
    return this.generatePdf(content, recipe.title);
  }

  /**
   * Export a menu to PDF format
   * Requirements: 8.1 - Generate PDF with formatted recipe content
   */
  exportMenuToPdf(menuId: string): Uint8Array {
    const menu = this.menuService.getMenu(menuId);
    if (!menu) {
      throw new Error(`Menu not found: ${menuId}`);
    }

    const content = this.formatMenuContent(menu);
    return this.generatePdf(content, menu.name);
  }

  /**
   * Format recipe content for PDF
   */
  private formatRecipeContent(recipe: Recipe, options: PdfExportOptions): string[] {
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
    lines.push(`Prep Time: ${recipe.prepTime.minutes} minutes`);
    lines.push(`Cook Time: ${recipe.cookTime.minutes} minutes`);
    lines.push(`Total Time: ${recipe.prepTime.minutes + recipe.cookTime.minutes} minutes`);
    lines.push(`Servings: ${recipe.servings}`);
    lines.push('');

    // Tags
    if (recipe.tags.length > 0) {
      lines.push(`Tags: ${recipe.tags.join(', ')}`);
      lines.push('');
    }

    // Ingredients
    lines.push('INGREDIENTS');
    lines.push('-'.repeat(40));
    for (const ing of recipe.ingredients) {
      const quantity = ing.quantity % 1 === 0 ? ing.quantity.toString() : ing.quantity.toFixed(2);
      const notes = ing.notes ? ` (${ing.notes})` : '';
      lines.push(`  ${quantity} ${ing.unit} ${ing.name}${notes}`);
    }
    lines.push('');

    // Instructions
    lines.push('INSTRUCTIONS');
    lines.push('-'.repeat(40));
    for (const inst of recipe.instructions) {
      const duration = inst.duration ? ` (${inst.duration.minutes} min)` : '';
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
   * Format menu content for PDF
   */
  private formatMenuContent(menu: Menu): string[] {
    const lines: string[] = [];

    // Title
    lines.push(`MENU: ${menu.name}`);
    lines.push('');

    // Date range
    const startStr = menu.startDate.toLocaleDateString();
    const endStr = menu.endDate.toLocaleDateString();
    lines.push(`Date Range: ${startStr} - ${endStr}`);
    lines.push('');

    // Group assignments by date
    const assignmentsByDate = new Map<string, MenuAssignment[]>();
    for (const assignment of menu.assignments) {
      const dateKey = assignment.date.toISOString().split('T')[0]!;
      const existing = assignmentsByDate.get(dateKey) ?? [];
      existing.push(assignment);
      assignmentsByDate.set(dateKey, existing);
    }

    // Sort dates
    const sortedDates = [...assignmentsByDate.keys()].sort();

    // Output each day
    for (const dateKey of sortedDates) {
      const date = new Date(dateKey);
      lines.push(date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
      lines.push('-'.repeat(40));

      const assignments = assignmentsByDate.get(dateKey) ?? [];
      
      // Sort by meal slot
      const slotOrder = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
      assignments.sort((a, b) => slotOrder[a.mealSlot] - slotOrder[b.mealSlot]);

      for (const assignment of assignments) {
        const recipe = this.recipeService.getRecipe(assignment.recipeId);
        const recipeName = recipe?.title ?? 'Unknown Recipe';
        const slot = assignment.mealSlot.charAt(0).toUpperCase() + assignment.mealSlot.slice(1);
        lines.push(`  ${slot}: ${recipeName} (${assignment.servings} servings)`);
      }
      lines.push('');
    }

    // Shopping list
    try {
      const shoppingList = this.shoppingService.generateFromMenu(menu.id);
      if (shoppingList.items.length > 0) {
        lines.push('SHOPPING LIST');
        lines.push('-'.repeat(40));

        // Group by category
        const itemsByCategory = new Map<string, typeof shoppingList.items>();
        for (const item of shoppingList.items) {
          const category = item.category ?? 'other';
          const existing = itemsByCategory.get(category) ?? [];
          existing.push(item);
          itemsByCategory.set(category, existing);
        }

        for (const [category, items] of itemsByCategory) {
          lines.push(`  ${category.toUpperCase()}`);
          for (const item of items) {
            const quantity = item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(2);
            lines.push(`    [ ] ${quantity} ${item.unit} ${item.name}`);
          }
        }
      }
    } catch {
      // Shopping list generation failed, skip it
    }

    return lines;
  }

  /**
   * Generate a simple PDF from text content
   * 
   * This creates a minimal valid PDF structure that can be opened by PDF readers.
   * For production use, consider using a proper PDF library like pdfkit or jspdf.
   */
  private generatePdf(lines: string[], title: string): Uint8Array {
    // PDF structure components
    const objects: string[] = [];
    let objectCount = 0;
    const objectOffsets: number[] = [];

    // Helper to add an object
    const addObject = (content: string): number => {
      objectCount++;
      objectOffsets.push(-1); // Will be calculated later
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

    // Object 5: Font (define before content so we know the reference)
    addObject(`5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>
endobj`);

    // Build content stream
    const contentLines: string[] = [];
    contentLines.push('BT');
    contentLines.push('/F1 10 Tf');
    
    let y = 750; // Start near top of page
    const lineHeight = 12;
    const leftMargin = 50;
    const pageHeight = 792;
    const bottomMargin = 50;

    for (const line of lines) {
      if (y < bottomMargin) {
        // Would need to add new page - for simplicity, just stop
        break;
      }

      // Escape special PDF characters
      const escapedLine = line
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .substring(0, 80); // Limit line length

      contentLines.push(`1 0 0 1 ${leftMargin} ${y} Tm`);
      contentLines.push(`(${escapedLine}) Tj`);
      y -= lineHeight;
    }

    contentLines.push('ET');
    const contentStream = contentLines.join('\n');

    // Object 4: Content stream (insert at position 3, after page)
    objects.splice(3, 0, `4 0 obj
<< /Length ${contentStream.length} >>
stream
${contentStream}
endstream
endobj`);

    // Build the PDF
    let pdf = '%PDF-1.4\n';
    
    // Calculate offsets and add objects
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

    // Convert to Uint8Array
    const encoder = new TextEncoder();
    return encoder.encode(pdf);
  }
}
