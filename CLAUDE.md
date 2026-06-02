# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (auto-reloads on save)
pnpm dev

# Run all tests
pnpm test

# Run tests in watch mode (from backend package)
pnpm --filter @recipe-blocks/backend test:watch

# Lint / format
pnpm lint
pnpm format

# Database (requires Docker)
docker compose up -d db       # start Postgres
docker compose down           # stop

# Migrations (run from repo root)
pnpm --filter @recipe-blocks/backend migration:generate -- src/migrations/<MigrationName>
pnpm --filter @recipe-blocks/backend migration:run
pnpm --filter @recipe-blocks/backend migration:revert
```

## Stack

TypeScript, Express, TypeORM, PostgreSQL, AWS SDK v3

## Conventions

- Named exports only
- No `any` types — use `unknown` and narrow
- Async/await, not callbacks
- Entities in `src/entities/`, routes in `src/routes/`, services in `src/services/`

## Before writing code

1. Use Context7 to load current docs for any library you're about to touch
2. Read the relevant files before editing them
3. Check `src/entities/` before writing any query — don't assume column names

## Domain Model

Recipes form a **directed acyclic graph (DAG)**. **Cycle detection must be enforced on every write** — the critical path scheduler breaks if cycles exist.

### Core entities

**`ingredients`** — real-world ingredient concepts ("chili oil", "soy sauce"). Anchor for substitution and cross-referencing.

**`recipes`** — both full dishes and sub-components use the same table. `recipe_type` is a varchar with a check constraint (not a Postgres enum):
- `component` — exists only within a parent recipe, never browsed independently
- `ingredient` — standalone producible thing, reusable across recipes (e.g., chili oil, stocks, spice blends)
- `dish` — what users browse when deciding what to make

**`recipe_produces`** (junction) — a recipe can produce multiple ingredient concepts (a barbecue sauce recipe might produce "barbecue sauce", "glaze", and "wing sauce").

**`recipe_ingredients`** — the DAG edges. Each row: "this recipe needs this ingredient concept, in this quantity."
- `canonical_recipe_id` (optional) — the specific sub-recipe the author recommends for this ingredient. Must reference a recipe that produces `ingredient_id`. **Enforced at app level, not DB level.**

### Priorities

Cooking/execution experience ("I'm making this tonight") is the priority. Authoring UX just needs to work. Frontend rendering of nested recipe trees in a usable cooking interface is the main UI challenge — start simple.

### Key behaviors to preserve

**Ingredient substitution:** `ingredient_id` is always the anchor. `canonical_recipe_id` is a suggestion. Users can use store-bought, the canonical sub-recipe, or any other recipe that produces the ingredient concept.

**Critical path scheduling:** Given a target serve time, the scheduler walks the dependency graph backwards using `time_estimate` on each recipe node to produce a start-time for each component.
