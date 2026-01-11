# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start dev server (usually localhost:5173)
npm run build    # TypeScript check + production build
npm run lint     # Run ESLint
npm run deploy   # Build and deploy to GitHub Pages
```

## Architecture Overview

NutriTrack is a local-first nutrition tracking PWA. All data is stored in the browser's IndexedDB via Dexie.js - no backend server.

### Tech Stack
- **React 19** + TypeScript + Vite
- **Tailwind CSS v4** with `@theme` block for CSS variables (see `src/index.css`)
- **Dexie.js** for IndexedDB storage with `dexie-react-hooks` for reactive queries
- **React Router** with HashRouter (for GitHub Pages compatibility)

### Data Flow
1. **Database** (`src/db/database.ts`) - Dexie schema defines tables: foods, recipes, inventory, mealPlans, dailyLogs, settings, usdaSearchCache
2. **Services** (`src/services/`) - Business logic layer that reads/writes to Dexie
3. **Components** use `useLiveQuery` hook for reactive data binding to IndexedDB

### Key Patterns

**Database queries must use indexed fields.** The foods table indexes: `id, name, source, usdaFdcId, barcode, category, isFavorite, createdAt`. Using `orderBy()` on non-indexed fields (like `updatedAt`) will throw DexieError.

**Type definitions** live in `src/types/database.ts` - this is the source of truth for all data models.

**Services pattern:** Each feature has a service file that handles database operations:
- `daily-log-service.ts` - Log entries, daily totals
- `meal-plan-service.ts` - Weekly planning, mark as eaten
- `inventory-service.ts` - Pantry tracking, expiration
- `food-service.ts` - Food CRUD, search
- `ai-suggestion-service.ts` - Multi-provider AI integration (Gemini, OpenAI, Anthropic, Ollama)

### External APIs
- **USDA FoodData Central** - Food nutrition lookup (requires free API key)
- **AI Providers** - Configurable in settings, API keys stored in IndexedDB

### UI Components
- `src/components/ui/` - Base components (Button, Card, Dialog, Input, Select)
- `src/components/common/` - Shared app components (modals, macro displays)
- `src/components/layout/` - App shell and bottom navigation
- `src/features/` - Page-level components organized by feature

### User-Specific Defaults
Default nutrition goals are calibrated for someone with lower caloric needs:
- Calories: 1,350-1,450
- Protein: 50-65g
- Fiber: 15-25g

Touch-first UI with 44px+ touch targets for tablet use.
