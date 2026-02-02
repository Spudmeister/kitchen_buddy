/**
 * Recipe Parser Service for Sous Chef
 * Extracts recipe data from URLs and HTML using schema.org structured data
 */
import { parseDuration } from '../types/units.js';
/**
 * Extract schema.org Recipe data from HTML
 * Supports both JSON-LD and Microdata formats
 */
export function extractSchemaOrg(html) {
    // Try JSON-LD first (most common modern format)
    const jsonLdRecipe = extractJsonLd(html);
    if (jsonLdRecipe) {
        return jsonLdRecipe;
    }
    // Fall back to Microdata
    const microdataRecipe = extractMicrodata(html);
    if (microdataRecipe) {
        return microdataRecipe;
    }
    return null;
}
/**
 * Extract recipe from JSON-LD script tags
 */
function extractJsonLd(html) {
    // Match all JSON-LD script tags
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
        try {
            const jsonContent = match[1];
            if (!jsonContent)
                continue;
            const data = JSON.parse(jsonContent.trim());
            const recipe = findRecipeInJsonLd(data);
            if (recipe) {
                return recipe;
            }
        }
        catch {
            // Invalid JSON, continue to next script tag
            continue;
        }
    }
    return null;
}
/**
 * Recursively find a Recipe object in JSON-LD data
 */
function findRecipeInJsonLd(data) {
    if (!data || typeof data !== 'object') {
        return null;
    }
    // Check if this is a Recipe
    if (isRecipeType(data)) {
        return data;
    }
    // Check @graph array (common in WordPress sites)
    if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
            const recipe = findRecipeInJsonLd(item);
            if (recipe) {
                return recipe;
            }
        }
    }
    // Check if it's an array of items
    if (Array.isArray(data)) {
        for (const item of data) {
            const recipe = findRecipeInJsonLd(item);
            if (recipe) {
                return recipe;
            }
        }
    }
    return null;
}
/**
 * Check if an object is a Recipe type
 */
function isRecipeType(obj) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    const type = obj['@type'];
    if (typeof type === 'string') {
        return type === 'Recipe' || type === 'https://schema.org/Recipe';
    }
    if (Array.isArray(type)) {
        return type.some((t) => t === 'Recipe' || t === 'https://schema.org/Recipe');
    }
    return false;
}
/**
 * Extract recipe from Microdata format
 */
function extractMicrodata(html) {
    // Find the recipe container with itemtype="https://schema.org/Recipe"
    const recipeMatch = html.match(/<[^>]+itemtype=["']https?:\/\/schema\.org\/Recipe["'][^>]*>([\s\S]*?)(?=<[^>]+itemtype=["']https?:\/\/schema\.org\/|$)/i);
    if (!recipeMatch) {
        return null;
    }
    const recipeHtml = recipeMatch[0];
    const recipe = { '@type': 'Recipe' };
    // Extract name
    const nameMatch = recipeHtml.match(/<[^>]+itemprop=["']name["'][^>]*>([^<]*)<|itemprop=["']name["'][^>]*content=["']([^"']+)["']/i);
    if (nameMatch) {
        recipe.name = (nameMatch[1] || nameMatch[2])?.trim();
    }
    // Extract description
    const descMatch = recipeHtml.match(/<[^>]+itemprop=["']description["'][^>]*>([^<]*)<|itemprop=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch) {
        recipe.description = (descMatch[1] || descMatch[2])?.trim();
    }
    // Extract ingredients
    const ingredientRegex = /<[^>]+itemprop=["']recipeIngredient["'][^>]*>([^<]*)<|itemprop=["']recipeIngredient["'][^>]*content=["']([^"']+)["']/gi;
    const ingredients = [];
    let ingredientMatch;
    while ((ingredientMatch = ingredientRegex.exec(recipeHtml)) !== null) {
        const ingredient = (ingredientMatch[1] || ingredientMatch[2])?.trim();
        if (ingredient) {
            ingredients.push(ingredient);
        }
    }
    if (ingredients.length > 0) {
        recipe.recipeIngredient = ingredients;
    }
    // Extract instructions
    const instructionRegex = /<[^>]+itemprop=["']recipeInstructions["'][^>]*>([^<]*)<|itemprop=["']recipeInstructions["'][^>]*content=["']([^"']+)["']/gi;
    const instructions = [];
    let instructionMatch;
    while ((instructionMatch = instructionRegex.exec(recipeHtml)) !== null) {
        const instruction = (instructionMatch[1] || instructionMatch[2])?.trim();
        if (instruction) {
            instructions.push(instruction);
        }
    }
    if (instructions.length > 0) {
        recipe.recipeInstructions = instructions;
    }
    // Extract prep time
    const prepTimeMatch = recipeHtml.match(/itemprop=["']prepTime["'][^>]*content=["']([^"']+)["']|itemprop=["']prepTime["'][^>]*datetime=["']([^"']+)["']/i);
    if (prepTimeMatch) {
        recipe.prepTime = prepTimeMatch[1] || prepTimeMatch[2];
    }
    // Extract cook time
    const cookTimeMatch = recipeHtml.match(/itemprop=["']cookTime["'][^>]*content=["']([^"']+)["']|itemprop=["']cookTime["'][^>]*datetime=["']([^"']+)["']/i);
    if (cookTimeMatch) {
        recipe.cookTime = cookTimeMatch[1] || cookTimeMatch[2];
    }
    // Extract yield/servings
    const yieldMatch = recipeHtml.match(/<[^>]+itemprop=["']recipeYield["'][^>]*>([^<]*)<|itemprop=["']recipeYield["'][^>]*content=["']([^"']+)["']/i);
    if (yieldMatch) {
        recipe.recipeYield = (yieldMatch[1] || yieldMatch[2])?.trim();
    }
    // Extract image
    const imageMatch = recipeHtml.match(/itemprop=["']image["'][^>]*(?:src|content)=["']([^"']+)["']/i);
    if (imageMatch) {
        recipe.image = imageMatch[1];
    }
    // Only return if we have at least a name
    if (recipe.name) {
        return recipe;
    }
    return null;
}
/**
 * Convert schema.org recipe to ParsedRecipe
 */
export function schemaOrgToRecipe(schema, sourceUrl) {
    const recipe = {
        title: schema.name || 'Untitled Recipe',
        ingredients: schema.recipeIngredient || [],
        instructions: extractInstructions(schema.recipeInstructions),
        sourceUrl,
    };
    if (schema.description) {
        recipe.description = schema.description;
    }
    if (schema.prepTime) {
        recipe.prepTime = parseDuration(schema.prepTime) || undefined;
    }
    if (schema.cookTime) {
        recipe.cookTime = parseDuration(schema.cookTime) || undefined;
    }
    recipe.servings = parseServings(schema.recipeYield);
    recipe.imageUrl = extractImageUrl(schema.image);
    return recipe;
}
/**
 * Extract instructions from various schema.org formats
 */
function extractInstructions(instructions) {
    if (!instructions) {
        return [];
    }
    // Single string - split by newlines or numbered steps
    if (typeof instructions === 'string') {
        return splitInstructionString(instructions);
    }
    // Array of strings
    if (Array.isArray(instructions) && instructions.length > 0) {
        if (typeof instructions[0] === 'string') {
            return instructions.map((s) => s.trim()).filter(Boolean);
        }
        // Array of HowToStep/HowToSection objects
        return flattenInstructionObjects(instructions);
    }
    return [];
}
/**
 * Split a single instruction string into steps
 */
function splitInstructionString(text) {
    // Try splitting by numbered steps (1. 2. 3. or 1) 2) 3))
    const numberedSteps = text.split(/(?:^|\n)\s*\d+[.)]\s*/);
    if (numberedSteps.length > 1) {
        return numberedSteps.map((s) => s.trim()).filter(Boolean);
    }
    // Try splitting by newlines
    const lines = text.split(/\n+/);
    if (lines.length > 1) {
        return lines.map((s) => s.trim()).filter(Boolean);
    }
    // Return as single step
    return [text.trim()].filter(Boolean);
}
/**
 * Flatten HowToStep/HowToSection objects into string array
 */
function flattenInstructionObjects(instructions) {
    const result = [];
    for (const item of instructions) {
        if (item.text) {
            result.push(item.text.trim());
        }
        else if (item.name) {
            result.push(item.name.trim());
        }
        // Handle HowToSection with nested steps
        if (item.itemListElement && Array.isArray(item.itemListElement)) {
            result.push(...flattenInstructionObjects(item.itemListElement));
        }
    }
    return result.filter(Boolean);
}
/**
 * Parse servings from recipeYield
 */
function parseServings(yield_) {
    if (yield_ === undefined) {
        return undefined;
    }
    if (typeof yield_ === 'number') {
        return yield_;
    }
    // Handle array - take first element
    const yieldStr = Array.isArray(yield_) ? yield_[0] : yield_;
    if (typeof yieldStr !== 'string') {
        return undefined;
    }
    // Extract first number from string
    const match = yieldStr.match(/(\d+)/);
    return match && match[1] ? parseInt(match[1], 10) : undefined;
}
/**
 * Extract image URL from various schema.org image formats
 */
function extractImageUrl(image) {
    if (!image) {
        return undefined;
    }
    if (typeof image === 'string') {
        return image;
    }
    if (Array.isArray(image)) {
        const first = image[0];
        if (typeof first === 'string') {
            return first;
        }
        if (first && typeof first === 'object' && first.url) {
            return first.url;
        }
        return undefined;
    }
    if (typeof image === 'object' && image.url) {
        return image.url;
    }
    return undefined;
}
/**
 * Parse recipe from HTML content
 */
export function parseFromHtml(html, sourceUrl) {
    const schemaOrg = extractSchemaOrg(html);
    if (!schemaOrg) {
        return {
            success: false,
            confidence: 0,
            source: 'schema.org',
            errors: ['No schema.org Recipe data found in HTML'],
        };
    }
    const recipe = schemaOrgToRecipe(schemaOrg, sourceUrl);
    // Calculate confidence based on completeness
    let confidence = 0.5; // Base confidence for finding schema.org data
    if (recipe.title && recipe.title !== 'Untitled Recipe')
        confidence += 0.1;
    if (recipe.ingredients.length > 0)
        confidence += 0.15;
    if (recipe.instructions.length > 0)
        confidence += 0.15;
    if (recipe.prepTime || recipe.cookTime)
        confidence += 0.05;
    if (recipe.servings)
        confidence += 0.05;
    return {
        success: true,
        recipe,
        confidence: Math.min(confidence, 1),
        source: 'schema.org',
    };
}
/**
 * Default parse options
 */
const DEFAULT_PARSE_OPTIONS = {
    timeout: 10000,
    userAgent: 'SousChef/1.0 (Recipe Parser)',
};
/**
 * Parse recipe from URL
 * Fetches the URL and extracts schema.org data
 */
export async function parseFromUrl(url, options = {}) {
    const opts = { ...DEFAULT_PARSE_OPTIONS, ...options };
    // Validate URL
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    }
    catch {
        return {
            success: false,
            confidence: 0,
            source: 'schema.org',
            errors: ['Invalid URL format'],
        };
    }
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
            success: false,
            confidence: 0,
            source: 'schema.org',
            errors: ['Only HTTP and HTTPS URLs are supported'],
        };
    }
    try {
        // Fetch the URL
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), opts.timeout);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': opts.userAgent,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            return {
                success: false,
                confidence: 0,
                source: 'schema.org',
                errors: [`HTTP error: ${response.status} ${response.statusText}`],
            };
        }
        const html = await response.text();
        return parseFromHtml(html, url);
    }
    catch (error) {
        const message = error instanceof Error
            ? error.name === 'AbortError'
                ? 'Request timed out'
                : error.message
            : 'Unknown error occurred';
        return {
            success: false,
            confidence: 0,
            source: 'schema.org',
            errors: [`Failed to fetch URL: ${message}`],
        };
    }
}
/**
 * Unit aliases mapping common variations to standard units
 */
const UNIT_ALIASES = {
    // Teaspoon
    teaspoon: 'tsp',
    teaspoons: 'tsp',
    tsp: 'tsp',
    tsps: 'tsp',
    't': 'tsp',
    // Tablespoon
    tablespoon: 'tbsp',
    tablespoons: 'tbsp',
    tbsp: 'tbsp',
    tbsps: 'tbsp',
    tbs: 'tbsp',
    tb: 'tbsp',
    // Cup
    cup: 'cup',
    cups: 'cup',
    c: 'cup',
    // Fluid ounce
    'fluid ounce': 'fl_oz',
    'fluid ounces': 'fl_oz',
    'fl oz': 'fl_oz',
    'fl. oz': 'fl_oz',
    floz: 'fl_oz',
    // Pint
    pint: 'pint',
    pints: 'pint',
    pt: 'pint',
    // Quart
    quart: 'quart',
    quarts: 'quart',
    qt: 'quart',
    qts: 'quart',
    // Gallon
    gallon: 'gallon',
    gallons: 'gallon',
    gal: 'gallon',
    // Milliliter
    milliliter: 'ml',
    milliliters: 'ml',
    millilitre: 'ml',
    millilitres: 'ml',
    ml: 'ml',
    // Liter
    liter: 'l',
    liters: 'l',
    litre: 'l',
    litres: 'l',
    l: 'l',
    // Ounce (weight)
    ounce: 'oz',
    ounces: 'oz',
    oz: 'oz',
    // Pound
    pound: 'lb',
    pounds: 'lb',
    lb: 'lb',
    lbs: 'lb',
    // Gram
    gram: 'g',
    grams: 'g',
    g: 'g',
    gr: 'g',
    // Kilogram
    kilogram: 'kg',
    kilograms: 'kg',
    kg: 'kg',
    kilo: 'kg',
    kilos: 'kg',
    // Piece
    piece: 'piece',
    pieces: 'piece',
    pc: 'piece',
    pcs: 'piece',
    // Dozen
    dozen: 'dozen',
    doz: 'dozen',
    // Other
    pinch: 'pinch',
    pinches: 'pinch',
    dash: 'dash',
    dashes: 'dash',
};
/**
 * Fraction mappings for common unicode and text fractions
 */
const FRACTIONS = {
    '½': 0.5,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '¼': 0.25,
    '¾': 0.75,
    '⅕': 0.2,
    '⅖': 0.4,
    '⅗': 0.6,
    '⅘': 0.8,
    '⅙': 1 / 6,
    '⅚': 5 / 6,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
    '1/2': 0.5,
    '1/3': 1 / 3,
    '2/3': 2 / 3,
    '1/4': 0.25,
    '3/4': 0.75,
    '1/5': 0.2,
    '2/5': 0.4,
    '3/5': 0.6,
    '4/5': 0.8,
    '1/6': 1 / 6,
    '5/6': 5 / 6,
    '1/8': 0.125,
    '3/8': 0.375,
    '5/8': 0.625,
    '7/8': 0.875,
};
/**
 * Category keywords for auto-categorization
 */
const CATEGORY_KEYWORDS = {
    produce: [
        'apple', 'banana', 'orange', 'lemon', 'lime', 'tomato', 'potato', 'onion',
        'garlic', 'carrot', 'celery', 'lettuce', 'spinach', 'kale', 'broccoli',
        'cauliflower', 'pepper', 'cucumber', 'zucchini', 'squash', 'mushroom',
        'avocado', 'berry', 'grape', 'melon', 'peach', 'pear', 'plum', 'mango',
        'pineapple', 'strawberry', 'blueberry', 'raspberry', 'herb', 'basil',
        'cilantro', 'parsley', 'mint', 'thyme', 'rosemary', 'sage', 'dill',
        'ginger', 'scallion', 'shallot', 'leek', 'cabbage', 'corn', 'pea',
        'bean', 'asparagus', 'artichoke', 'beet', 'radish', 'turnip', 'eggplant',
    ],
    meat: [
        'beef', 'chicken', 'pork', 'lamb', 'turkey', 'duck', 'veal', 'bacon',
        'ham', 'sausage', 'steak', 'ground', 'roast', 'chop', 'rib', 'breast',
        'thigh', 'wing', 'drumstick', 'tenderloin', 'brisket', 'sirloin',
    ],
    seafood: [
        'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'trout', 'bass',
        'shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'mussel', 'clam',
        'oyster', 'squid', 'calamari', 'octopus', 'anchovy', 'sardine',
    ],
    dairy: [
        'milk', 'cream', 'butter', 'cheese', 'yogurt', 'sour cream', 'cottage',
        'ricotta', 'mozzarella', 'cheddar', 'parmesan', 'feta', 'brie',
        'gouda', 'swiss', 'provolone', 'cream cheese', 'half and half',
        'whipping cream', 'heavy cream', 'buttermilk', 'egg', 'eggs',
    ],
    bakery: [
        'bread', 'roll', 'bun', 'bagel', 'croissant', 'muffin', 'tortilla',
        'pita', 'naan', 'baguette', 'sourdough', 'ciabatta', 'focaccia',
    ],
    frozen: [
        'frozen', 'ice cream', 'sorbet', 'gelato', 'popsicle',
    ],
    pantry: [
        'flour', 'sugar', 'salt', 'oil', 'vinegar', 'soy sauce', 'pasta',
        'rice', 'noodle', 'bean', 'lentil', 'chickpea', 'can', 'canned',
        'broth', 'stock', 'tomato paste', 'tomato sauce', 'honey', 'maple',
        'syrup', 'molasses', 'cornstarch', 'baking powder', 'baking soda',
        'yeast', 'vanilla', 'chocolate', 'cocoa', 'nut', 'almond', 'walnut',
        'pecan', 'cashew', 'peanut', 'oat', 'cereal', 'cracker', 'chip',
    ],
    spices: [
        'salt', 'pepper', 'cumin', 'paprika', 'cinnamon', 'nutmeg', 'clove',
        'cardamom', 'coriander', 'turmeric', 'curry', 'chili', 'cayenne',
        'oregano', 'basil', 'thyme', 'rosemary', 'sage', 'bay leaf', 'dill',
        'parsley', 'cilantro', 'mint', 'ginger', 'garlic powder', 'onion powder',
        'mustard', 'allspice', 'fennel', 'anise', 'saffron', 'vanilla extract',
    ],
    beverages: [
        'water', 'juice', 'wine', 'beer', 'coffee', 'tea', 'soda', 'milk',
        'coconut milk', 'almond milk', 'oat milk', 'broth', 'stock',
    ],
    other: [],
};
/**
 * Normalize a raw ingredient string into structured data
 */
export function normalizeIngredient(raw) {
    const trimmed = raw.trim();
    // Extract quantity
    const { quantity, remaining: afterQuantity } = extractQuantity(trimmed);
    // Extract unit
    const { unit, remaining: afterUnit } = extractUnit(afterQuantity);
    // Extract notes (usually in parentheses or after comma)
    const { name, notes } = extractNameAndNotes(afterUnit);
    // Determine category
    const category = categorizeIngredient(name);
    return {
        name: name.trim(),
        quantity,
        unit,
        notes: notes?.trim() || undefined,
        category,
        raw: trimmed,
    };
}
/**
 * Extract quantity from the beginning of an ingredient string
 */
function extractQuantity(text) {
    let remaining = text.trim();
    let quantity = 1;
    // Check for unicode fractions at the start
    for (const [frac, value] of Object.entries(FRACTIONS)) {
        if (remaining.startsWith(frac)) {
            quantity = value;
            remaining = remaining.slice(frac.length).trim();
            // Check for additional whole number before fraction (e.g., "1 ½")
            const wholeMatch = text.match(/^(\d+)\s*$/);
            if (wholeMatch && wholeMatch[1]) {
                quantity = parseInt(wholeMatch[1], 10) + value;
            }
            return { quantity, remaining };
        }
    }
    // Match patterns like "1", "1.5", "1 1/2", "1-2" (take first number)
    const quantityMatch = remaining.match(/^(\d+(?:\.\d+)?)\s*(?:[-–—to]\s*\d+(?:\.\d+)?)?\s*/);
    if (quantityMatch && quantityMatch[1]) {
        quantity = parseFloat(quantityMatch[1]);
        remaining = remaining.slice(quantityMatch[0].length);
        // Check for fraction after whole number
        for (const [frac, value] of Object.entries(FRACTIONS)) {
            if (remaining.startsWith(frac)) {
                quantity += value;
                remaining = remaining.slice(frac.length).trim();
                break;
            }
        }
    }
    // Handle text fractions like "1/2" at the start
    const textFractionMatch = remaining.match(/^(\d+)\/(\d+)\s*/);
    if (textFractionMatch && textFractionMatch[1] && textFractionMatch[2]) {
        const numerator = parseInt(textFractionMatch[1], 10);
        const denominator = parseInt(textFractionMatch[2], 10);
        if (denominator !== 0) {
            quantity = numerator / denominator;
        }
        remaining = remaining.slice(textFractionMatch[0].length);
    }
    return { quantity, remaining };
}
/**
 * Extract unit from the beginning of a string (after quantity)
 */
function extractUnit(text) {
    const trimmed = text.trim().toLowerCase();
    // Sort aliases by length (longest first) to match "fluid ounce" before "ounce"
    const sortedAliases = Object.entries(UNIT_ALIASES).sort((a, b) => b[0].length - a[0].length);
    for (const [alias, unit] of sortedAliases) {
        // Check if text starts with this alias followed by space or end
        const pattern = new RegExp(`^${escapeRegex(alias)}(?:\\s+|\\.|$)`, 'i');
        const match = trimmed.match(pattern);
        if (match) {
            const matchedLength = findOriginalLength(text, alias);
            return {
                unit,
                remaining: text.slice(matchedLength).trim(),
            };
        }
    }
    // No unit found - default to piece
    return { unit: 'piece', remaining: text };
}
/**
 * Find the length of the matched alias in the original (possibly mixed-case) text
 */
function findOriginalLength(original, alias) {
    const lower = original.toLowerCase();
    const idx = lower.indexOf(alias.toLowerCase());
    if (idx === 0) {
        // Skip any trailing period or space
        let end = alias.length;
        while (end < original.length && (original[end] === '.' || original[end] === ' ')) {
            end++;
            if (original[end - 1] === '.')
                break; // Only skip one period
        }
        return end;
    }
    return alias.length;
}
/**
 * Escape special regex characters
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Extract ingredient name and notes from remaining text
 */
function extractNameAndNotes(text) {
    const trimmed = text.trim();
    // Check for notes in parentheses
    const parenMatch = trimmed.match(/^([^(]+)\s*\(([^)]+)\)\s*(.*)$/);
    if (parenMatch && parenMatch[1] && parenMatch[2]) {
        const name = parenMatch[1].trim();
        const parenNotes = parenMatch[2].trim();
        const afterParen = (parenMatch[3] || '').trim();
        // Combine notes if there's text after parentheses
        const notes = afterParen ? `${parenNotes}, ${afterParen}` : parenNotes;
        return { name, notes };
    }
    // Check for notes after comma
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx > 0) {
        return {
            name: trimmed.slice(0, commaIdx).trim(),
            notes: trimmed.slice(commaIdx + 1).trim(),
        };
    }
    // Check for common note indicators
    const noteIndicators = [' - ', ' – ', ' — '];
    for (const indicator of noteIndicators) {
        const idx = trimmed.indexOf(indicator);
        if (idx > 0) {
            return {
                name: trimmed.slice(0, idx).trim(),
                notes: trimmed.slice(idx + indicator.length).trim(),
            };
        }
    }
    return { name: trimmed };
}
/**
 * Categorize an ingredient based on its name
 */
function categorizeIngredient(name) {
    const lower = name.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (category === 'other')
            continue;
        for (const keyword of keywords) {
            if (lower.includes(keyword)) {
                return category;
            }
        }
    }
    return 'other';
}
/**
 * Normalize all ingredients from a parsed recipe
 */
export function normalizeIngredients(rawIngredients) {
    return rawIngredients.map(normalizeIngredient);
}
/**
 * Parse recipe from HTML with optional AI fallback
 * Requirements: 1.5, 1.6 - Schema.org first, AI fallback when enabled
 *
 * @param html - HTML content to parse
 * @param sourceUrl - Optional source URL
 * @param options - Parse options including AI service
 * @returns Parse result with recipe data
 */
export async function parseFromHtmlWithAI(html, sourceUrl, options) {
    // Try schema.org parsing first
    const schemaResult = parseFromHtml(html, sourceUrl);
    if (schemaResult.success) {
        return schemaResult;
    }
    // If AI is enabled and available, try AI parsing
    if (options?.useAI && options?.aiService?.isEnabled()) {
        try {
            const aiRecipe = await options.aiService.parseRecipe(html);
            // Add source URL to the parsed recipe
            if (sourceUrl) {
                aiRecipe.sourceUrl = sourceUrl;
            }
            // Calculate confidence based on completeness
            let confidence = 0.6; // Base confidence for AI parsing
            if (aiRecipe.title && aiRecipe.title !== 'Untitled Recipe')
                confidence += 0.1;
            if (aiRecipe.ingredients.length > 0)
                confidence += 0.1;
            if (aiRecipe.instructions.length > 0)
                confidence += 0.1;
            if (aiRecipe.prepTime || aiRecipe.cookTime)
                confidence += 0.05;
            if (aiRecipe.servings)
                confidence += 0.05;
            return {
                success: true,
                recipe: aiRecipe,
                confidence: Math.min(confidence, 1),
                source: 'ai',
            };
        }
        catch (error) {
            // AI parsing failed, return original error with AI error appended
            return {
                success: false,
                confidence: 0,
                source: 'ai',
                errors: [
                    ...(schemaResult.errors || []),
                    `AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ],
            };
        }
    }
    // Return original schema.org error
    return schemaResult;
}
/**
 * Parse recipe from URL with optional AI fallback
 * Requirements: 1.5, 1.6 - Schema.org first, AI fallback when enabled
 *
 * @param url - URL to fetch and parse
 * @param options - Parse options including AI service
 * @returns Parse result with recipe data
 */
export async function parseFromUrlWithAI(url, options = {}) {
    const opts = { ...DEFAULT_PARSE_OPTIONS, ...options };
    // Validate URL
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    }
    catch {
        return {
            success: false,
            confidence: 0,
            source: 'schema.org',
            errors: ['Invalid URL format'],
        };
    }
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
            success: false,
            confidence: 0,
            source: 'schema.org',
            errors: ['Only HTTP and HTTPS URLs are supported'],
        };
    }
    try {
        // Fetch the URL
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), opts.timeout);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': opts.userAgent,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            return {
                success: false,
                confidence: 0,
                source: 'schema.org',
                errors: [`HTTP error: ${response.status} ${response.statusText}`],
            };
        }
        const html = await response.text();
        return parseFromHtmlWithAI(html, url, options);
    }
    catch (error) {
        const message = error instanceof Error
            ? error.name === 'AbortError'
                ? 'Request timed out'
                : error.message
            : 'Unknown error occurred';
        return {
            success: false,
            confidence: 0,
            source: 'schema.org',
            errors: [`Failed to fetch URL: ${message}`],
        };
    }
}
//# sourceMappingURL=recipe-parser.js.map