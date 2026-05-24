# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Dev server at http://localhost:4200 (proxies /api → localhost:5023)
npm run build    # Production build → dist/osrs-calc-ui/browser/
npm run watch    # Dev build in watch mode
npm test         # Run Vitest unit tests (*.spec.ts files)
```

The backend API must be running on port 5023 for local development — all `/api/*` requests proxy there via `proxy.conf.json`.

## Architecture

**Angular 21 SPA** using the standalone component API (no NgModules). State is managed through Angular signals and RxJS — there is no centralized state library.

### Routing

Two routes defined in `src/app/app.routes.ts`:
- `/` → `Home` component
- `/skills/:skill` → `SkillCalculator` component (skill name from URL param, e.g. `/skills/farming`)

### Core Layer (`src/app/core/`)

**Services** (all provided in root):
- `skill-data.service.ts` — fetches skill action data from the API
- `player-state.service.ts` — holds the player's hiscore data (levels, XP, ranks) as signals
- `player.service.ts` — loads player data by username, populates `PlayerStateService`
- `grand-exchange.service.ts` — item price lookups from the API
- `skill-selection-state.service.ts` — tracks which skill is currently active
- `theme.service.ts` — dark/light mode toggle (signal-based)
- `image.service.ts`, `icon-cache.service.ts` — fetch and cache OSRS item/skill icons

**Models** (`src/app/core/models/osrs.models.ts`):
- `SkillAction` — trainable activity with level requirement and XP; farming/herblore/smithing properties are optional fields on the same interface (not discriminated unions)
- `FarmingPatch` / `FarmingPatches` — patch location data
- `OutfitDefinition` — skill outfit XP bonus configuration
- `PrayerBonus` — prayer multiplier definitions
- `HiscoreEntry` — player hiscore response shape

### Feature Layer (`src/app/features/`)

**`skill-calculator/`** is the shared shell component that:
1. Reads the `:skill` URL param and query params (`?level=&xp=&rank=`)
2. Falls back to `PlayerStateService` data when no query params are present
3. Computes XP needed and progress via Angular `computed()` signals
4. Renders the matching per-skill component via `@if` / `@switch` in the template
5. Contains the OSRS XP table (levels 1–126 + virtual, up to 200M cap) computed inline

Each skill subdirectory (`agility/`, `cooking/`, `farming/`, etc.) is a standalone component imported directly by `SkillCalculator`. The **Farming** skill has additional sub-components: `patch-group-table/` and `special-patch-table/`.

**`home/`** — landing page; links to skill calculators.

### Shared Components (`src/app/shared/components/`)

- `navbar/` — global nav with skill links
- `ad-banner/` — Google AdSense injection (slot IDs come from environment config)
- `outfit-bonus-panel/` — reusable outfit XP bonus UI
- `skill-actions-table/` — reusable table for displaying skill training actions

### Environments (`src/environments/`)

- `environment.ts` (production): `apiBaseUrl: '/api'`
- `environment.development.ts`: `apiBaseUrl: 'http://localhost:5023/api'`

## Production Deployment

Two-stage Docker build:
1. **Build stage**: Node 22-Alpine compiles the Angular app
2. **Runtime stage**: OpenResty (nginx + Lua) serves the SPA and acts as BFF proxy

The Lua layer intercepts `/api/*` requests, fetches a GCP Service Account identity token from the metadata server (cached 55 min in shared memory), injects it as a Bearer token, and forwards the request to the upstream Cloud Run API service. The `API_URL` env var is set at runtime to the API Cloud Run service URL.

Infrastructure is managed with OpenTofu (open-source Terraform). CI/CD runs via two GitHub Actions workflows:
- `docker-build-push.yml` — builds and pushes image to GCP Artifact Registry on push to `main`
- `deploy.yml` — runs OpenTofu to update the Cloud Run service (requires manual approval for production)

## Git Workflow

- Work on feature branches (`feature/my-fix`), then open a PR to `main`
- Never push directly to `main` or merge PRs — the repo owner handles review and merge
- Conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

## Code Style

- Prettier: 100-char print width, single quotes (`.prettierrc`)
- SCSS for all styles; 2-space indentation (`.editorconfig`)
- TypeScript strict mode enabled with `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`
