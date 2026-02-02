/**
 * PDF Service - Generates PDF exports for recipes and menus
 *
 * Requirements: 8.1 - Generate PDF with formatted recipe content
 *
 * This is a simple PDF generator that creates basic PDF documents
 * without requiring external dependencies.
 */
import type { Database } from '../db/database.js';
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
export declare class PdfService {
    private db;
    private recipeService;
    private menuService;
    private shoppingService;
    constructor(db: Database);
    /**
     * Export a recipe to PDF format
     * Requirements: 8.1 - Generate PDF with formatted recipe content
     */
    exportRecipeToPdf(recipeId: string, options?: PdfExportOptions): Uint8Array;
    /**
     * Export a menu to PDF format
     * Requirements: 8.1 - Generate PDF with formatted recipe content
     */
    exportMenuToPdf(menuId: string): Uint8Array;
    /**
     * Format recipe content for PDF
     */
    private formatRecipeContent;
    /**
     * Format menu content for PDF
     */
    private formatMenuContent;
    /**
     * Generate a simple PDF from text content
     *
     * This creates a minimal valid PDF structure that can be opened by PDF readers.
     * For production use, consider using a proper PDF library like pdfkit or jspdf.
     */
    private generatePdf;
}
//# sourceMappingURL=pdf-service.d.ts.map