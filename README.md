# Sous Chef 🍳

A local-first recipe and grocery management application for your kitchen.

## Quick Start (Non-Technical Users)

### macOS / Linux

1. Open Terminal
2. Navigate to this folder: `cd path/to/sous-chef`
3. Run: `./scripts/install.sh`
4. Run: `./scripts/start.sh`

### Windows

1. Open PowerShell
2. Navigate to this folder: `cd path\to\sous-chef`
3. Run: `.\scripts\install.ps1`
4. Run: `.\scripts\start.ps1`

## What You Need First

- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
  - Choose the "LTS" version (recommended for most users)
  - Run the installer and follow the prompts

## Features

- 📝 Recipe management with ingredients, instructions, and photos
- 🛒 Smart shopping list generation
- 📅 Meal planning and menu scheduling
- 🔄 Unit conversion (US ↔ Metric)
- 📊 Cooking statistics and recommendations
- 💾 Local-first data storage (your data stays on your device)
- 📤 Export/import recipes in JSON format

## Troubleshooting

### "node is not recognized" or "command not found: node"
Node.js isn't installed or isn't in your PATH. Download and install it from [nodejs.org](https://nodejs.org/).

### "npm ERR!" during installation
Try running the install script again. If it persists, check your internet connection.

### Permission errors on macOS/Linux
Run: `chmod +x scripts/*.sh` then try again.

## For Developers

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Development mode (watch for changes)
npm run dev
```

## License

MIT
