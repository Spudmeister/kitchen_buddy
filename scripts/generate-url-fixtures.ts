/**
 * Recipe URL Fixture Generator
 *
 * Downloads and saves recipe page HTML as local fixtures for offline parser testing.
 * Covers the main parsing paths in src/services/recipe-parser.ts:
 *   - JSON-LD (most common modern format)
 *   - @graph JSON-LD (WordPress / Yoast SEO sites)
 *   - Microdata (older sites)
 *   - Edge cases (partial/unusual structured data)
 *
 * Usage:
 *   npm run generate-fixtures           # skip existing fixtures
 *   npm run generate-fixtures -- --force  # re-fetch all
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'tests', 'fixtures', 'url-html');

// ---------------------------------------------------------------------------
// Fixture definitions
// ---------------------------------------------------------------------------

interface FixtureUrl {
  url: string;
  name: string;
  /** Dominant structured-data format the URL is expected to contain */
  format: 'json-ld' | 'json-ld-graph' | 'microdata' | 'partial' | 'none';
  description?: string;
}

const FIXTURE_URLS: FixtureUrl[] = [
  // JSON-LD — straightforward Recipe object
  {
    url: 'https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/',
    name: 'allrecipes-chocolate-chip-cookies',
    format: 'json-ld',
    description: 'AllRecipes — standard JSON-LD Recipe',
  },
  {
    url: 'https://www.foodnetwork.com/recipes/alton-brown/the-chewy-recipe-1914700',
    name: 'foodnetwork-chewy-cookies',
    format: 'json-ld',
    description: 'Food Network — JSON-LD with HowToStep instructions',
  },
  {
    url: 'https://www.bonappetit.com/recipe/bas-best-chocolate-chip-cookies',
    name: 'bonappetit-chocolate-chip-cookies',
    format: 'json-ld',
    description: "Bon Appétit — JSON-LD, complex instruction objects",
  },
  {
    url: 'https://sallysbakingaddiction.com/chewy-chocolate-chip-cookies/',
    name: 'sallys-baking-chewy-cookies',
    format: 'json-ld',
    description: "Sally's Baking Addiction — JSON-LD with @graph (Yoast SEO)",
  },
  // JSON-LD inside @graph (WordPress/Yoast SEO pattern)
  {
    url: 'https://www.simplyrecipes.com/recipes/homemade_granola/',
    name: 'simplyrecipes-granola',
    format: 'json-ld-graph',
    description: 'Simply Recipes — @graph JSON-LD (common WordPress pattern)',
  },
  {
    url: 'https://cookieandkate.com/best-granola-recipe/',
    name: 'cookieandkate-granola',
    format: 'json-ld-graph',
    description: 'Cookie and Kate — WordPress @graph with Yoast SEO schema',
  },
  // Microdata
  {
    url: 'https://www.food.com/recipe/best-chocolate-chip-cookies-6344',
    name: 'foodcom-chocolate-chip-cookies',
    format: 'microdata',
    description: 'Food.com — schema.org Microdata (itemprop attributes)',
  },
  // Partial / edge-case structured data
  {
    url: 'https://www.epicurious.com/recipes/food/views/best-chocolate-chip-cookies-51234640',
    name: 'epicurious-chocolate-chip-cookies',
    format: 'partial',
    description: 'Epicurious — partial/wrapped JSON-LD (edge case for parser)',
  },
  {
    url: 'https://www.kingarthurbaking.com/recipes/classic-chocolate-chip-cookies-recipe',
    name: 'kingarthur-chocolate-chip-cookies',
    format: 'json-ld',
    description: 'King Arthur Baking — JSON-LD with array image field',
  },
  // Site without structured data (tests graceful fallback / "none" path)
  {
    url: 'https://www.seriouseats.com/the-best-chocolate-chip-cookies-recipe-the-food-lab',
    name: 'seriouseats-chocolate-chip-cookies',
    format: 'json-ld',
    description: 'Serious Eats — JSON-LD with nested instructions',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_AGENT =
  'Mozilla/5.0 (compatible; SousChef-FixtureBot/1.0; +https://github.com/example/sous-chef)';

const FETCH_TIMEOUT_MS = 15_000;

interface MetaJson {
  url: string;
  name: string;
  format: string;
  description?: string;
  fetchedAt: string;
  byteSize: number;
}

function htmlPath(name: string): string {
  return join(OUTPUT_DIR, `${name}.html`);
}

function metaPath(name: string): string {
  return join(OUTPUT_DIR, `${name}.meta.json`);
}

function fixtureExists(name: string): boolean {
  return existsSync(htmlPath(name)) && existsSync(metaPath(name));
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

type Status = 'saved' | 'skipped' | 'error';

interface Result {
  name: string;
  status: Status;
  bytes?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  const force = process.argv.includes('--force');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`\nRecipe URL Fixture Generator`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Force re-fetch: ${force}\n`);

  const results: Result[] = [];

  for (const fixture of FIXTURE_URLS) {
    const { url, name, format, description } = fixture;

    if (!force && fixtureExists(name)) {
      console.log(`  [skip]  ${name}`);
      results.push({ name, status: 'skipped' });
      continue;
    }

    process.stdout.write(`  [fetch] ${name} … `);

    try {
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const byteSize = Buffer.byteLength(html, 'utf8');

      writeFileSync(htmlPath(name), html, 'utf8');

      const meta: MetaJson = {
        url,
        name,
        format,
        description,
        fetchedAt: new Date().toISOString(),
        byteSize,
      };
      writeFileSync(metaPath(name), JSON.stringify(meta, null, 2) + '\n', 'utf8');

      console.log(`${(byteSize / 1024).toFixed(1)} KB`);
      results.push({ name, status: 'saved', bytes: byteSize });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`ERROR — ${message}`);
      results.push({ name, status: 'error', error: message });
    }
  }

  // Summary table
  const col = (s: string, w: number): string => s.padEnd(w).slice(0, w);

  console.log('\n─── Summary ─────────────────────────────────────────────────────────');
  console.log(`${col('Name', 46)}${col('Status', 9)}Bytes`);
  console.log('─'.repeat(70));

  for (const r of results) {
    const bytes =
      r.status === 'saved' && r.bytes !== undefined
        ? `${(r.bytes / 1024).toFixed(1)} KB`
        : r.status === 'error'
          ? r.error ?? ''
          : '—';
    console.log(`${col(r.name, 46)}${col(r.status, 9)}${bytes}`);
  }

  const saved = results.filter((r) => r.status === 'saved').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errors = results.filter((r) => r.status === 'error').length;

  console.log('─'.repeat(70));
  console.log(`Saved: ${saved}  Skipped: ${skipped}  Errors: ${errors}\n`);

  if (errors > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
