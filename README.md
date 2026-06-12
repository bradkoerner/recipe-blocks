# Recipe Blocks

A personal recipe management app built around the idea that recipes are made of **building blocks**, not flat lists of ingredients and instructions. Cooking involves composable components — a sauce, a marinade, a spice blend — that can be prepared separately, reused across dishes, and understood independently.

The full specification lives in [docs/Recipe App Spec.md](docs/Recipe%20App%20Spec.md). The reference UI rendering is [docs/mockups/recipe-thread-view-mockup.html](docs/mockups/recipe-thread-view-mockup.html). This README is a summary; the spec is canonical.

## UI Model: Steps as the Tree

A recipe is **not** an ingredient list at the top and instructions at the bottom. A recipe is an ordered list of concise steps, and ingredient/sub-recipe references appear as **expandable chips inline within step text** — structured like JSON, rendered like a Reddit thread.

```
1. Spoon 2 tbsp [tare ▸] into each warmed bowl.
2. Ladle in 1.5 cups hot [tonkotsu broth ▾] per bowl, whisk to combine.
   │  Tonkotsu broth · makes 1.5 qt · 6h          [make ahead] [open ↗]
   │  1. Blanch 3 lb pork bones, rinse clean.
   │  2. Hard boil with [aromatics ▸] 6 hours, topping up water.
   │  3. Strain. Should be opaque white and coat a spoon.
3. Add 1 portion cooked (noodles) per bowl.        [swap]
4. Top with 2 slices [chashu ▸], one halved [marinated egg ▸],
   sliced scallions, and nori.
```

- Everything collapsed by default; a dish reads as ~4–6 lines at rest.
- Expansion inserts the sub-recipe's own steps inline below the referencing step, recursively, inside an indent rail.
- Quantities live in the referencing step's text; expansions show the sub-recipe at its natural yield.
- "All ingredients (N)" is a single collapsible at the top, computed by flattening the ref graph.

## Data Model

- **`ingredients`** — real-world ingredient concepts ("chili oil", "soy sauce"). The anchor for substitution and cross-referencing.
- **`recipes`** — dishes, reusable sub-recipes, and one-off components share one table, distinguished by `recipe_type` (`component` | `ingredient` | `dish`). No `instructions` text column — steps are structured rows. Nullable `yield_amount`/`yield_unit` for the "makes 1.5 qt" metadata line.
- **`recipe_steps`** — ordered steps per recipe. Step text contains inline `[display text](ref:ID)` tokens.
- **`step_refs`** — the DAG edges. `ingredient_id` and `canonical_recipe_id` both nullable (at least one set): ingredient-only refs are substitutable pills, anchored recipe refs are expandable + swappable, recipe-only refs embed component sub-recipes directly with no substitution anchor.
- **`recipe_produces`** — junction; a recipe can produce multiple ingredient concepts.

Recipes form a **directed acyclic graph**. Cycle detection is enforced on every write.

## Authoring

Write flat first, structure later. A plain numbered-step recipe is always valid. Structure arrives via **highlight-to-promote**: select a phrase in a step ("2 tbsp of peanut butter") → it becomes an ingredient ref token, parsed into quantity/unit/concept. Linking a sub-recipe can happen later or never.

## Key Behaviors

- **Substitution:** `ingredient_id` is the anchor; the canonical recipe is a suggestion. Store-bought, canonical, or any recipe producing the same concept all work.
- **Critical path scheduling:** given a serve time, walk the ref graph backwards using `time_estimate` to emit start times per component. Only refs marked "make it" contribute.

## Stack

TypeScript, Express, TypeORM, PostgreSQL. pnpm monorepo.

```bash
docker compose up -d db    # Postgres
pnpm dev                   # dev server
pnpm test                  # tests
```

## Scope

Personal use only — no auth, no sharing. Cooking/execution experience is the priority; authoring UX can be rough, but highlight-to-promote is load-bearing for v1.
