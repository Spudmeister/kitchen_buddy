/**
 * Substitution Service - Ingredient substitutions and recipe suggestions
 *
 * Provides functionality for suggesting ingredient alternatives with conversion
 * ratios and finding recipes based on available ingredients.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
import { RecipeService } from './recipe-service.js';
/**
 * Built-in substitution database
 * Maps ingredient names to their possible substitutions
 */
const SUBSTITUTION_DATABASE = new Map([
    // Dairy substitutions
    ['butter', [
            { original: 'butter', substitute: 'coconut oil', ratio: 1, category: 'dairy', notes: 'May add slight coconut flavor' },
            { original: 'butter', substitute: 'olive oil', ratio: 0.75, category: 'dairy', notes: 'Best for savory dishes' },
            { original: 'butter', substitute: 'applesauce', ratio: 0.5, category: 'dairy', notes: 'For baking, reduces fat content' },
            { original: 'butter', substitute: 'greek yogurt', ratio: 0.5, category: 'dairy', notes: 'Adds moisture and protein' },
            { original: 'butter', substitute: 'avocado', ratio: 1, category: 'dairy', notes: 'Creamy texture, adds nutrients' },
        ]],
    ['milk', [
            { original: 'milk', substitute: 'almond milk', ratio: 1, category: 'dairy', notes: 'Lighter flavor, nut-free alternatives available' },
            { original: 'milk', substitute: 'oat milk', ratio: 1, category: 'dairy', notes: 'Creamy texture, good for baking' },
            { original: 'milk', substitute: 'soy milk', ratio: 1, category: 'dairy', notes: 'Similar protein content' },
            { original: 'milk', substitute: 'coconut milk', ratio: 1, category: 'dairy', notes: 'Richer, may add coconut flavor' },
        ]],
    ['heavy cream', [
            { original: 'heavy cream', substitute: 'coconut cream', ratio: 1, category: 'dairy', notes: 'Rich and creamy, slight coconut taste' },
            { original: 'heavy cream', substitute: 'evaporated milk', ratio: 1, category: 'dairy', notes: 'Less fat, similar consistency' },
        ]],
    ['sour cream', [
            { original: 'sour cream', substitute: 'greek yogurt', ratio: 1, category: 'dairy', notes: 'Tangier, higher protein' },
            { original: 'sour cream', substitute: 'cottage cheese', ratio: 1, category: 'dairy', notes: 'Blend until smooth' },
        ]],
    ['cream cheese', [
            { original: 'cream cheese', substitute: 'greek yogurt', ratio: 1, category: 'dairy', notes: 'Lower fat, tangier' },
            { original: 'cream cheese', substitute: 'ricotta', ratio: 1, category: 'dairy', notes: 'Lighter texture' },
        ]],
    // Egg substitutions
    ['egg', [
            { original: 'egg', substitute: 'flax egg', ratio: 1, category: 'egg', notes: '1 tbsp ground flax + 3 tbsp water per egg, let sit 5 min' },
            { original: 'egg', substitute: 'chia egg', ratio: 1, category: 'egg', notes: '1 tbsp chia seeds + 3 tbsp water per egg, let sit 5 min' },
            { original: 'egg', substitute: 'applesauce', ratio: 0.25, unit: 'cup', category: 'egg', notes: '1/4 cup per egg, adds sweetness' },
            { original: 'egg', substitute: 'mashed banana', ratio: 0.25, unit: 'cup', category: 'egg', notes: '1/4 cup per egg, adds banana flavor' },
            { original: 'egg', substitute: 'silken tofu', ratio: 0.25, unit: 'cup', category: 'egg', notes: '1/4 cup blended per egg' },
        ]],
    ['eggs', [
            { original: 'eggs', substitute: 'flax eggs', ratio: 1, category: 'egg', notes: '1 tbsp ground flax + 3 tbsp water per egg, let sit 5 min' },
            { original: 'eggs', substitute: 'chia eggs', ratio: 1, category: 'egg', notes: '1 tbsp chia seeds + 3 tbsp water per egg, let sit 5 min' },
            { original: 'eggs', substitute: 'applesauce', ratio: 0.25, unit: 'cup', category: 'egg', notes: '1/4 cup per egg, adds sweetness' },
        ]],
    // Flour substitutions
    ['all-purpose flour', [
            { original: 'all-purpose flour', substitute: 'whole wheat flour', ratio: 1, category: 'flour', notes: 'Denser texture, nuttier flavor' },
            { original: 'all-purpose flour', substitute: 'almond flour', ratio: 1, category: 'flour', notes: 'Gluten-free, denser, moister' },
            { original: 'all-purpose flour', substitute: 'oat flour', ratio: 1, category: 'flour', notes: 'Gluten-free if certified, slightly sweet' },
            { original: 'all-purpose flour', substitute: 'coconut flour', ratio: 0.25, category: 'flour', notes: 'Very absorbent, use 1/4 amount' },
        ]],
    ['flour', [
            { original: 'flour', substitute: 'whole wheat flour', ratio: 1, category: 'flour', notes: 'Denser texture, nuttier flavor' },
            { original: 'flour', substitute: 'almond flour', ratio: 1, category: 'flour', notes: 'Gluten-free, denser, moister' },
            { original: 'flour', substitute: 'oat flour', ratio: 1, category: 'flour', notes: 'Gluten-free if certified, slightly sweet' },
        ]],
    ['bread flour', [
            { original: 'bread flour', substitute: 'all-purpose flour', ratio: 1, category: 'flour', notes: 'Less gluten, softer texture' },
        ]],
    // Sweetener substitutions
    ['sugar', [
            { original: 'sugar', substitute: 'honey', ratio: 0.75, category: 'sweetener', notes: 'Reduce liquid by 1/4 cup, adds flavor' },
            { original: 'sugar', substitute: 'maple syrup', ratio: 0.75, category: 'sweetener', notes: 'Reduce liquid by 3 tbsp, adds flavor' },
            { original: 'sugar', substitute: 'coconut sugar', ratio: 1, category: 'sweetener', notes: 'Lower glycemic index, caramel notes' },
            { original: 'sugar', substitute: 'stevia', ratio: 0.5, unit: 'tsp', category: 'sweetener', notes: 'Much sweeter, use sparingly' },
        ]],
    ['brown sugar', [
            { original: 'brown sugar', substitute: 'white sugar + molasses', ratio: 1, category: 'sweetener', notes: '1 cup sugar + 1 tbsp molasses' },
            { original: 'brown sugar', substitute: 'coconut sugar', ratio: 1, category: 'sweetener', notes: 'Similar flavor profile' },
            { original: 'brown sugar', substitute: 'maple syrup', ratio: 0.75, category: 'sweetener', notes: 'Reduce liquid slightly' },
        ]],
    ['honey', [
            { original: 'honey', substitute: 'maple syrup', ratio: 1, category: 'sweetener', notes: 'Different flavor, similar consistency' },
            { original: 'honey', substitute: 'agave nectar', ratio: 1, category: 'sweetener', notes: 'Milder flavor, vegan option' },
        ]],
    // Fat substitutions
    ['vegetable oil', [
            { original: 'vegetable oil', substitute: 'olive oil', ratio: 1, category: 'fat', notes: 'Stronger flavor, better for savory' },
            { original: 'vegetable oil', substitute: 'coconut oil', ratio: 1, category: 'fat', notes: 'May add slight coconut flavor' },
            { original: 'vegetable oil', substitute: 'applesauce', ratio: 0.5, category: 'fat', notes: 'For baking, reduces fat' },
            { original: 'vegetable oil', substitute: 'avocado oil', ratio: 1, category: 'fat', notes: 'Neutral flavor, high smoke point' },
        ]],
    ['olive oil', [
            { original: 'olive oil', substitute: 'avocado oil', ratio: 1, category: 'fat', notes: 'Neutral flavor, high smoke point' },
            { original: 'olive oil', substitute: 'coconut oil', ratio: 1, category: 'fat', notes: 'Different flavor profile' },
        ]],
    // Protein substitutions
    ['chicken', [
            { original: 'chicken', substitute: 'tofu', ratio: 1, category: 'protein', notes: 'Press and marinate for best results' },
            { original: 'chicken', substitute: 'tempeh', ratio: 1, category: 'protein', notes: 'Firmer texture, nutty flavor' },
            { original: 'chicken', substitute: 'turkey', ratio: 1, category: 'protein', notes: 'Similar texture and flavor' },
            { original: 'chicken', substitute: 'chickpeas', ratio: 1.5, category: 'protein', notes: 'Different texture, good in curries' },
        ]],
    ['beef', [
            { original: 'beef', substitute: 'mushrooms', ratio: 1, category: 'protein', notes: 'Portobello for steaks, mixed for ground' },
            { original: 'beef', substitute: 'lentils', ratio: 1, category: 'protein', notes: 'Good for ground beef dishes' },
            { original: 'beef', substitute: 'tempeh', ratio: 1, category: 'protein', notes: 'Crumble for tacos, chili' },
        ]],
    ['ground beef', [
            { original: 'ground beef', substitute: 'ground turkey', ratio: 1, category: 'protein', notes: 'Leaner, similar texture' },
            { original: 'ground beef', substitute: 'lentils', ratio: 1, category: 'protein', notes: 'Cook until tender, season well' },
            { original: 'ground beef', substitute: 'mushrooms', ratio: 1, category: 'protein', notes: 'Finely chop, good umami' },
        ]],
    // Liquid substitutions
    ['chicken broth', [
            { original: 'chicken broth', substitute: 'vegetable broth', ratio: 1, category: 'liquid', notes: 'Vegetarian option, lighter flavor' },
            { original: 'chicken broth', substitute: 'water + bouillon', ratio: 1, category: 'liquid', notes: 'Use 1 cube per cup water' },
            { original: 'chicken broth', substitute: 'mushroom broth', ratio: 1, category: 'liquid', notes: 'Rich umami flavor' },
        ]],
    ['beef broth', [
            { original: 'beef broth', substitute: 'mushroom broth', ratio: 1, category: 'liquid', notes: 'Deep umami flavor, vegetarian' },
            { original: 'beef broth', substitute: 'vegetable broth', ratio: 1, category: 'liquid', notes: 'Lighter flavor' },
        ]],
    ['wine', [
            { original: 'wine', substitute: 'grape juice', ratio: 1, category: 'liquid', notes: 'Add splash of vinegar for acidity' },
            { original: 'wine', substitute: 'broth', ratio: 1, category: 'liquid', notes: 'Add splash of vinegar for acidity' },
        ]],
    // Leavening substitutions
    ['baking powder', [
            { original: 'baking powder', substitute: 'baking soda + cream of tartar', ratio: 1, category: 'leavening', notes: '1/4 tsp soda + 1/2 tsp cream of tartar per 1 tsp powder' },
        ]],
    ['baking soda', [
            { original: 'baking soda', substitute: 'baking powder', ratio: 3, category: 'leavening', notes: 'Use 3x amount, may affect taste' },
        ]],
    ['yeast', [
            { original: 'yeast', substitute: 'baking powder', ratio: 1, unit: 'tsp', category: 'leavening', notes: '1 tsp per 1/4 oz yeast, different texture' },
        ]],
    // Spice substitutions
    ['garlic', [
            { original: 'garlic', substitute: 'garlic powder', ratio: 0.125, unit: 'tsp', category: 'spice', notes: '1/8 tsp per clove' },
            { original: 'garlic', substitute: 'shallots', ratio: 0.5, category: 'spice', notes: 'Milder, sweeter flavor' },
        ]],
    ['onion', [
            { original: 'onion', substitute: 'onion powder', ratio: 1, unit: 'tbsp', category: 'spice', notes: '1 tbsp per medium onion' },
            { original: 'onion', substitute: 'shallots', ratio: 2, category: 'spice', notes: 'Milder, use 2 shallots per onion' },
            { original: 'onion', substitute: 'leeks', ratio: 1, category: 'spice', notes: 'Milder, use white and light green parts' },
        ]],
    ['fresh herbs', [
            { original: 'fresh herbs', substitute: 'dried herbs', ratio: 0.33, category: 'spice', notes: 'Use 1/3 amount of dried' },
        ]],
    ['dried herbs', [
            { original: 'dried herbs', substitute: 'fresh herbs', ratio: 3, category: 'spice', notes: 'Use 3x amount of fresh' },
        ]],
]);
/**
 * Service for ingredient substitutions and recipe suggestions
 */
export class SubstitutionService {
    db;
    recipeService;
    constructor(db) {
        this.db = db;
        this.recipeService = new RecipeService(db);
    }
    /**
     * Get substitution suggestions for an ingredient
     * Requirements: 7.1 - Provide alternative ingredients with conversion ratios
     * Requirements: 7.3 - Note expected differences
     */
    getSubstitutions(ingredientName) {
        const normalizedName = this.normalizeIngredientName(ingredientName);
        // Try exact match first
        let substitutions = SUBSTITUTION_DATABASE.get(normalizedName);
        // If no exact match, try partial matches
        if (!substitutions) {
            for (const [key, subs] of SUBSTITUTION_DATABASE.entries()) {
                if (normalizedName.includes(key) || key.includes(normalizedName)) {
                    substitutions = subs.map(sub => ({
                        ...sub,
                        original: ingredientName, // Use the original name provided
                    }));
                    break;
                }
            }
        }
        return substitutions ?? [];
    }
    /**
     * Check if an ingredient has known substitutions
     */
    hasSubstitutions(ingredientName) {
        return this.getSubstitutions(ingredientName).length > 0;
    }
    /**
     * Get all available substitution categories
     */
    getSubstitutionCategories() {
        const categories = new Set();
        for (const subs of SUBSTITUTION_DATABASE.values()) {
            for (const sub of subs) {
                categories.add(sub.category);
            }
        }
        return Array.from(categories);
    }
    /**
     * Suggest recipes based on available ingredients
     * Requirements: 7.2 - Suggest recipes that can be made with available ingredients
     * Requirements: 7.4 - Suggest recipes with minimal missing ingredients
     *
     * Property 17: For any set of available ingredients, suggested recipes SHALL be
     * makeable with those ingredients (possibly with some missing), and SHALL be
     * ordered by the number of missing ingredients (ascending).
     */
    suggestRecipesByIngredients(availableIngredients, limit = 10) {
        // Normalize available ingredients for matching
        const normalizedAvailable = availableIngredients.map(i => this.normalizeIngredientName(i));
        // Get all non-archived recipes
        const recipeRows = this.db.exec(`SELECT id FROM recipes WHERE archived_at IS NULL`);
        const suggestions = [];
        for (const row of recipeRows) {
            const recipeId = row[0];
            const recipe = this.recipeService.getRecipe(recipeId);
            if (!recipe)
                continue;
            // Analyze ingredient matches
            const matchedIngredients = [];
            const missingIngredients = [];
            for (const ingredient of recipe.ingredients) {
                const normalizedIngredient = this.normalizeIngredientName(ingredient.name);
                const isMatched = normalizedAvailable.some(avail => this.ingredientsMatch(normalizedIngredient, avail));
                if (isMatched) {
                    matchedIngredients.push(ingredient.name);
                }
                else {
                    missingIngredients.push(ingredient.name);
                }
            }
            // Calculate match score (percentage of ingredients available)
            const totalIngredients = recipe.ingredients.length;
            const matchScore = totalIngredients > 0
                ? matchedIngredients.length / totalIngredients
                : 0;
            suggestions.push({
                recipe,
                matchedIngredients,
                missingIngredients,
                missingCount: missingIngredients.length,
                matchScore,
            });
        }
        // Sort by missing count ascending (fewer missing = better match)
        // Secondary sort by match score descending
        suggestions.sort((a, b) => {
            if (a.missingCount !== b.missingCount) {
                return a.missingCount - b.missingCount;
            }
            return b.matchScore - a.matchScore;
        });
        return suggestions.slice(0, limit);
    }
    /**
     * Find recipes that can be made with ONLY the available ingredients
     * (no missing ingredients)
     */
    findExactMatches(availableIngredients) {
        const suggestions = this.suggestRecipesByIngredients(availableIngredients, 100 // Get more to filter
        );
        return suggestions
            .filter(s => s.missingCount === 0)
            .map(s => s.recipe);
    }
    /**
     * Find recipes with at most N missing ingredients
     */
    findWithMaxMissing(availableIngredients, maxMissing, limit = 10) {
        const suggestions = this.suggestRecipesByIngredients(availableIngredients, 100 // Get more to filter
        );
        return suggestions
            .filter(s => s.missingCount <= maxMissing)
            .slice(0, limit);
    }
    /**
     * Get substitution suggestions for missing ingredients in a recipe
     */
    getSubstitutionsForRecipe(recipeId, availableIngredients) {
        const recipe = this.recipeService.getRecipe(recipeId);
        if (!recipe) {
            return new Map();
        }
        const normalizedAvailable = availableIngredients.map(i => this.normalizeIngredientName(i));
        const result = new Map();
        for (const ingredient of recipe.ingredients) {
            const normalizedIngredient = this.normalizeIngredientName(ingredient.name);
            const isAvailable = normalizedAvailable.some(avail => this.ingredientsMatch(normalizedIngredient, avail));
            if (!isAvailable) {
                const substitutions = this.getSubstitutions(ingredient.name);
                if (substitutions.length > 0) {
                    result.set(ingredient.name, substitutions);
                }
            }
        }
        return result;
    }
    // Private helper methods
    /**
     * Normalize an ingredient name for matching
     */
    normalizeIngredientName(name) {
        return name
            .toLowerCase()
            .trim()
            // Remove common quantity words
            .replace(/\b(fresh|dried|ground|chopped|minced|sliced|diced|whole|large|medium|small)\b/g, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }
    /**
     * Check if two ingredient names match
     * Uses fuzzy matching to handle variations
     */
    ingredientsMatch(ingredient, available) {
        // Exact match
        if (ingredient === available) {
            return true;
        }
        // One contains the other
        if (ingredient.includes(available) || available.includes(ingredient)) {
            return true;
        }
        // Check for common variations
        const ingredientWords = ingredient.split(' ');
        const availableWords = available.split(' ');
        // If the main word matches (usually the last word is the main ingredient)
        const mainIngredient = ingredientWords[ingredientWords.length - 1];
        const mainAvailable = availableWords[availableWords.length - 1];
        if (mainIngredient && mainAvailable) {
            if (mainIngredient === mainAvailable) {
                return true;
            }
            // Handle plurals
            if (mainIngredient + 's' === mainAvailable || mainIngredient === mainAvailable + 's') {
                return true;
            }
        }
        return false;
    }
}
//# sourceMappingURL=substitution-service.js.map