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

Canonical spec: `docs/Recipe App Spec.md`. Reference UI: `docs/mockups/recipe-thread-view-mockup.html`. Read the spec before any schema or rendering work.

Recipes form a **directed acyclic graph (DAG)**. Edges are `step_refs.canonical_recipe_id`. **Cycle detection must be enforced on every write** — the critical path scheduler breaks if cycles exist.

### Core entities

**`ingredients`** — real-world ingredient concepts ("chili oil", "soy sauce"). Anchor for substitution and cross-referencing.

**`recipes`** — both full dishes and sub-components use the same table. **No `instructions` text column** — steps are structured rows in `recipe_steps`. Nullable `yield_amount`/`yield_unit` varchars feed the expanded-chip metadata line; no yield-based scaling in v1. `recipe_type` is a varchar with a check constraint (not a Postgres enum):
- `component` — exists only within a parent recipe, never browsed independently
- `ingredient` — standalone producible thing, reusable across recipes (e.g., chili oil, stocks, tare)
- `dish` — what users browse when deciding what to make

**`recipe_steps`** — ordered steps per recipe (`recipe_id`, `position`, `text`). Step text embeds refs as **markdown-link tokens**: `[2 tbsp of peanut butter](ref:01J8X4)`. Token ID = `step_refs.id` (ULID). Parse with `\[([^\]]+)\]\(ref:([A-Za-z0-9]+)\)`. Display text is editable prose and may drift from the structured ref row — prose is for humans; the ref row feeds the shopping list and scheduler.

**`step_refs`** — the DAG edges (replaces the old `recipe_ingredients`). Both `ingredient_id` and `canonical_recipe_id` are nullable; a DB check requires at least one. Three shapes:
- `ingredient_id` only — plain ingredient (gray pill + swap)
- both — anchored recipe ref (purple chip + swap); `canonical_recipe_id` must reference a recipe that produces `ingredient_id` — **enforced at app level, not DB level**
- `canonical_recipe_id` only — direct ref to a component-type sub-recipe (chip, no swap). Components never get ingredient concepts or `recipe_produces` rows — keeps junk out of the substitution/matcher space. Created by step-extraction, not highlight-to-promote.

**`recipe_produces`** (junction) — a recipe can produce multiple ingredient concepts (a barbecue sauce recipe might produce "barbecue sauce", "glaze", and "wing sauce").

### Priorities

Cooking/execution experience ("I'm making this tonight") is the priority. The frontend target is the **thread renderer**: steps as the tree, refs as inline expandable chips, everything collapsed by default, expansion inserts sub-recipe steps inline under an indent rail. Authoring UX can be rough, but **highlight-to-promote** (select phrase → ingredient ref) is load-bearing and must exist in v1. Personal use only — no auth.

### Key behaviors to preserve

**Flat recipes are valid.** Plain numbered steps with zero refs must always work. Structure is added later via promotion; promotion and sub-recipe authoring are decoupled.

**Ingredient substitution:** `ingredient_id` is always the anchor. `canonical_recipe_id` is a suggestion. Users can use store-bought, the canonical sub-recipe, or any other recipe that produces the ingredient concept.

**Quantities live in the referencing step's text, never in the expansion.** Sub-recipes render at their natural yield; the chip's surrounding text says how much the parent uses.

**Critical path scheduling:** Given a target serve time, the scheduler walks the ref graph backwards using `time_estimate` on each recipe node to produce a start-time for each component. Only refs the user marks "make it" contribute.

**Data loading:** fetch the whole resolved recipe tree upfront (one recursive CTE — fine at personal scale), not lazy-load on expand.
