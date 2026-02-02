# Sous Chef 🍳

A local-first recipe and grocery management application for your kitchen.

## Quick Start

### macOS / Linux

```bash
./scripts/install.sh
./scripts/start.sh
```

### Windows (PowerShell)

```powershell
.\scripts\install.ps1
.\scripts\start.ps1
```

Then open **http://localhost:5173** in your browser.

## Requirements

- **Node.js 18+** - [Download here](https://nodejs.org/) (choose the LTS version)

## Features

- 📝 Recipe management with ingredients, instructions, and photos
- 🛒 Smart shopping list generation
- 📅 Meal planning and menu scheduling
- 🔄 Unit conversion (US ↔ Metric)
- 📊 Cooking statistics and recommendations
- 💾 Local-first data storage (your data stays on your device)
- 📤 Export/import recipes in JSON format
- 📱 Works offline as a Progressive Web App

## Troubleshooting

### "node is not recognized" or "command not found: node"
Node.js isn't installed or isn't in your PATH. Download and install it from [nodejs.org](https://nodejs.org/).

### "npm ERR!" during installation
Try running the install script again. If it persists, check your internet connection.

### Permission errors on macOS/Linux
Run: `chmod +x scripts/*.sh` then try again.

## For Developers

```bash
# Install all dependencies
npm run install:all

# Start development server
npm run dev

# Build for production
npm run build

# Run all tests
npm test

# Run only library tests
npm run test:lib

# Run only app tests
npm run test:app
```

## License

MIT
