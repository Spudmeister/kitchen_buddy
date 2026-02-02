/**
 * Recipe Instance Service - Manages recipe cook configurations
 *
 * Requirements: 18.1, 18.2, 18.3 - Capture and restore exact cooking configurations
 */
import { v4 as uuidv4 } from 'uuid';
import { RecipeService } from './recipe-service.js';
import { UnitConverter } from './unit-converter.js';
/**
 * Service for managing recipe instances (cook session configurations)
 */
export class RecipeInstanceService {
    db;
    recipeService;
    unitConverter;
    constructor(db) {
        this.db = db;
        this.recipeService = new RecipeService(db);
        this.unitConverter = new UnitConverter();
    }
    /**
     * Create a new recipe instance
     * Requirements: 18.1 - Create instance capturing exact configuration
     */
    createInstance(recipeId, config = {}) {
        // Get the recipe to capture current version
        const recipe = this.recipeService.getRecipe(recipeId);
        if (!recipe) {
            throw new Error(`Recipe not found: ${recipeId}`);
        }
        const instanceId = uuidv4();
        const now = new Date().toISOString();
        // Default values
        const scaleFactor = config.scaleFactor ?? 1.0;
        const unitSystem = config.unitSystem ?? 'us';
        const servings = config.servings ?? recipe.servings;
        return this.db.transaction(() => {
            // Insert instance record
            this.db.run(`INSERT INTO recipe_instances (id, recipe_id, recipe_version, cook_session_id, scale_factor, unit_system, servings, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                instanceId,
                recipeId,
                recipe.currentVersion,
                null, // cook_session_id can be linked later
                scaleFactor,
                unitSystem,
                servings,
                config.notes ?? null,
                now,
            ]);
            // Insert modifications if any
            if (config.modifications && config.modifications.length > 0) {
                for (const mod of config.modifications) {
                    const modId = uuidv4();
                    this.db.run(`INSERT INTO instance_modifications (id, instance_id, ingredient_index, original_quantity, modified_quantity, note)
             VALUES (?, ?, ?, ?, ?, ?)`, [
                        modId,
                        instanceId,
                        mod.ingredientIndex,
                        mod.originalQuantity,
                        mod.modifiedQuantity,
                        mod.note ?? null,
                    ]);
                }
            }
            return this.getInstance(instanceId);
        });
    }
    /**
     * Get a recipe instance by ID
     */
    getInstance(id) {
        const row = this.db.get(`SELECT id, recipe_id, recipe_version, cook_session_id, scale_factor, unit_system, servings, notes, created_at
       FROM recipe_instances WHERE id = ?`, [id]);
        if (!row) {
            return undefined;
        }
        const [instanceId, recipeId, recipeVersion, cookSessionId, scaleFactor, unitSystem, servings, notes, createdAt] = row;
        // Get modifications
        const modifications = this.getModifications(instanceId);
        // Get photo IDs
        const photoIds = this.getPhotoIds(instanceId);
        return {
            id: instanceId,
            recipeId,
            recipeVersion,
            cookSessionId: cookSessionId ?? undefined,
            scaleFactor,
            unitSystem: unitSystem,
            servings,
            notes: notes ?? undefined,
            modifications,
            photoIds,
            createdAt: new Date(createdAt),
        };
    }
    /**
     * Get all instances for a recipe
     */
    getInstancesForRecipe(recipeId) {
        const rows = this.db.exec(`SELECT id FROM recipe_instances WHERE recipe_id = ? ORDER BY created_at DESC`, [recipeId]);
        return rows
            .map(row => this.getInstance(row[0]))
            .filter((instance) => instance !== undefined);
    }
    /**
     * Load a recipe instance as a recipe with the instance's configuration applied
     * Requirements: 18.3 - Display recipe exactly as it was cooked
     * Requirements: 18.6 - Allow loading instance to restore exact configuration
     */
    loadInstanceAsRecipe(instanceId) {
        const instance = this.getInstance(instanceId);
        if (!instance) {
            throw new Error(`Recipe instance not found: ${instanceId}`);
        }
        // Get the recipe at the version that was used
        const recipe = this.recipeService.getRecipe(instance.recipeId, instance.recipeVersion);
        if (!recipe) {
            throw new Error(`Recipe not found: ${instance.recipeId}`);
        }
        // Apply scaling to ingredients
        const scaledIngredients = recipe.ingredients.map((ingredient, index) => {
            // Check if there's a modification for this ingredient
            const modification = instance.modifications.find(m => m.ingredientIndex === index);
            let quantity;
            if (modification) {
                // Use the modified quantity
                quantity = modification.modifiedQuantity;
            }
            else {
                // Apply scale factor
                quantity = ingredient.quantity * instance.scaleFactor;
            }
            // Convert to the instance's unit system if needed
            const convertedIngredient = this.unitConverter.convertToSystem({ ...ingredient, quantity }, instance.unitSystem);
            return convertedIngredient;
        });
        // Return the recipe with applied configuration
        return {
            ...recipe,
            ingredients: scaledIngredients,
            servings: instance.servings,
        };
    }
    /**
     * Link an instance to a cook session
     */
    linkToCookSession(instanceId, cookSessionId) {
        const result = this.db.run('UPDATE recipe_instances SET cook_session_id = ? WHERE id = ?', [cookSessionId, instanceId]);
        if (result.changes === 0) {
            throw new Error(`Recipe instance not found: ${instanceId}`);
        }
        // Also update the cook session to reference this instance
        this.db.run('UPDATE cook_sessions SET instance_id = ? WHERE id = ?', [instanceId, cookSessionId]);
    }
    /**
     * Delete a recipe instance
     */
    deleteInstance(id) {
        this.db.transaction(() => {
            // Delete modifications first
            this.db.run('DELETE FROM instance_modifications WHERE instance_id = ?', [id]);
            // Update photos to remove instance reference
            this.db.run('UPDATE photos SET instance_id = NULL WHERE instance_id = ?', [id]);
            // Delete the instance
            const result = this.db.run('DELETE FROM recipe_instances WHERE id = ?', [id]);
            if (result.changes === 0) {
                throw new Error(`Recipe instance not found: ${id}`);
            }
        });
    }
    /**
     * Get the instance associated with a photo
     * Requirements: 17.3 - Navigate from photo to exact recipe configuration
     */
    getInstanceFromPhoto(photoId) {
        const row = this.db.get('SELECT instance_id FROM photos WHERE id = ?', [photoId]);
        if (!row || !row[0]) {
            return undefined;
        }
        return this.getInstance(row[0]);
    }
    /**
     * Get modifications for an instance
     */
    getModifications(instanceId) {
        const rows = this.db.exec(`SELECT ingredient_index, original_quantity, modified_quantity, note
       FROM instance_modifications WHERE instance_id = ? ORDER BY ingredient_index`, [instanceId]);
        return rows.map(row => ({
            ingredientIndex: row[0],
            originalQuantity: row[1],
            modifiedQuantity: row[2],
            note: row[3] ?? undefined,
        }));
    }
    /**
     * Get photo IDs for an instance
     */
    getPhotoIds(instanceId) {
        const rows = this.db.exec('SELECT id FROM photos WHERE instance_id = ? ORDER BY created_at', [instanceId]);
        return rows.map(row => row[0]);
    }
}
//# sourceMappingURL=instance-service.js.map