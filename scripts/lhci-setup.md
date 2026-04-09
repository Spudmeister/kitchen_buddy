# Lighthouse CI Setup

Lighthouse CI enforces the project's performance targets:
- Lighthouse score 90+ across Performance, Accessibility, Best Practices, and PWA
- First Contentful Paint: < 2000ms
- Time to Interactive: < 3000ms
- Total Blocking Time: < 300ms

## Install

From the `pwa/` directory, install the Lighthouse CI CLI as a dev dependency:

```bash
cd pwa
npm install -D @lhci/cli
```

## Run Locally

From the project root:

```bash
npm run lhci
```

This is equivalent to running `npm run build:app && cd pwa && npm run lhci`, which:

1. Builds the PWA via Vite (`pwa/dist/`)
2. Starts a static file server pointed at `pwa/dist`
3. Runs Lighthouse 3 times against that server
4. Asserts all score and metric thresholds defined in `lighthouserc.json`
5. Uploads results to temporary public storage for review

## How It Works

The `lighthouserc.json` at the project root drives the run:

- **`collect.staticDistDir`** — Points Lighthouse CI at the pre-built `pwa/dist` directory so no Vite dev server is needed in CI.
- **`collect.numberOfRuns: 3`** — Runs Lighthouse three times and takes the median, giving more stable scores than a single run.
- **`collect.settings`** — Uses desktop preset with simulated 3G-equivalent throttling (40ms RTT, ~1.6 Mbps).
- **`assert.assertions`** — Fails the CI step if any score falls below 0.9 or any metric exceeds its budget.
- **`upload.target`** — Publishes a temporary shareable report URL after each run.

## CI Integration (GitHub Actions)

Add Lighthouse CI as a step after `npm run build` in your workflow:

```yaml
- name: Install dependencies
  run: npm run install:all

- name: Install Lighthouse CI
  run: cd pwa && npm install -D @lhci/cli

- name: Build PWA
  run: npm run build:app

- name: Run Lighthouse CI
  run: npm run lhci
```

A full example workflow (`.github/workflows/lhci.yml`):

```yaml
name: Lighthouse CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm run install:all

      - name: Install Lighthouse CI
        run: cd pwa && npm install -D @lhci/cli

      - name: Build PWA
        run: npm run build:app

      - name: Run Lighthouse CI
        run: npm run lhci
```
