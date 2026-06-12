# Recipe App — Project Specification

*Updated June 11, 2026 — incorporates UI/data-model conclusions from the recipe-view design session. Companion file: `recipe-thread-view-mockup.html` (reference rendering of the target UI).*

## Concept

A personal recipe management app built around the idea that recipes are made of **building blocks**, not flat lists of ingredients and instructions. The core insight is that cooking involves composable components — a sauce, a marinade, a spice blend — that can be prepared separately, reused across dishes, and understood independently.

The app solves a real friction point: the constant back-and-forth between an ingredient list and a step list while cooking. Ingredients and instructions are grouped together at the point of use. The recipe **is its steps**; everything else hangs off them.

---

## UI Model: Steps as the Tree

This is the governing design decision. A recipe is **not** an ingredient list at the top and instructions at the bottom. A recipe is an ordered list of concise steps, and ingredients with sub-recipes appear as **expandable references inline within step text** — structured like JSON, rendered like a Reddit thread.

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

### Rendering rules

- **A step can contain multiple refs**, each independently expandable. "Add toppings" is one step with several chips, never N steps.
- **Refs with a `canonical_recipe_id` render as expandable chips** (purple in mockup). Refs without one render as plain pills (gray) with a "swap" affordance instead of a chevron. Direct refs (component sub-recipes, no `ingredient_id`) render as expandable chips with **no swap** — there's no ingredient anchor to substitute against.
- **Expansion inserts the sub-recipe's own steps directly below the referencing step**, inside an indent rail. The parent step's text stays visible above, so the reader never loses the sentence they were in. Sub-recipe steps contain their own refs, recursively.
- **Expanded blocks get exactly one line of metadata**: name · yield · time, plus an open-as-own-page link. Nothing else.
- **Everything is collapsed by default.** Depth is controlled by collapse-by-default + the indent rail, Reddit-style. A dish reads as ~4–6 lines at rest.
- **Quantities live in the referencing step's text, never in the expansion.** The expansion shows how to make the thing at its natural yield; the chip's surrounding text says how much this recipe uses. This keeps sub-recipes reusable without per-parent rewording.
- **"All ingredients (N)" is a single collapsible at the top** for planning/shopping — computed by flattening the ref graph (store-bought swaps prune that subtree).
- **Open-as-own-page** remains on every expandable chip for the make-ahead case; expansion is primary, navigation is secondary.

---

## Core Data Model

### `ingredients`
The concept of a real-world ingredient — "chili oil," "soy sauce," "garlic." The anchor for substitution and cross-referencing.

```
id
name
```

### `recipes`
Both full recipes and sub-components, same structure. **The `instructions` text field is gone** — instructions are now structured rows in `recipe_steps`.

```
id
name
description
time_estimate        ← used for critical path scheduling
recipe_type          ← varchar: component | ingredient | dish (check constraint, not a Postgres enum)
yield_amount         ← NULLABLE varchar ("1.5", "6–8")
yield_unit           ← NULLABLE varchar ("qt", "servings")
```

Yield feeds the expanded-block metadata line ("makes 1.5 qt · 6h"). It is a property of one batch of the recipe, not of each produced concept — hence on `recipes`, not `recipe_produces`. **No yield-based scaling in v1**: the flattened shopping list shows sub-recipe ingredients at their natural yield; needed÷yield scaling is a later decision.

**`recipe_type` values (unchanged semantics, now expressed as rendering cues rather than layout):**
- `component` — exists only within a parent recipe, never browsed independently (e.g., a marinade for a specific dish)
- `ingredient` — standalone producible thing, reusable across recipes (e.g., chili oil, stocks, tare)
- `dish` — self-contained recipe browsed when deciding what to make

### `recipe_steps` (new)
The ordered steps of a recipe. Step text contains inline reference tokens (see Token Syntax).

```
id
recipe_id
position             ← integer ordering within the recipe
text                 ← prose with inline [display text](ref:ID) tokens
```

### `step_refs` (replaces `recipe_ingredients`)
The edges of the graph, now attached at the **step** level instead of the recipe level. Each row: "this step uses this ingredient concept, in this quantity, optionally made via this recipe."

```
id                   ← ULID; referenced by the token in step text
step_id
ingredient_id        ← NULLABLE; the ingredient concept required
canonical_recipe_id  ← NULLABLE; the sub-recipe the author recommends
quantity
unit
```

**DB check constraint:** at least one of `ingredient_id` / `canonical_recipe_id` is non-null. This gives three ref shapes:

| Shape | `ingredient_id` | `canonical_recipe_id` | Renders as |
|---|---|---|---|
| Ingredient ref | set | null | gray pill + swap |
| Anchored recipe ref | set | set | purple chip, expandable + swap |
| Direct ref (component) | null | set | component chip, expandable, **no swap** |

**Notes:**
- When both are set, `canonical_recipe_id` must reference a recipe that produces `ingredient_id` (application-level enforcement).
- `canonical_recipe_id` is nullable **by design** — a ref to an ingredient concept exists immediately at promote time; it becomes an expandable chip later, when/if a recipe producing that ingredient exists. Promotion and sub-recipe authoring are decoupled.
- `ingredient_id` is nullable **by design** — component-type sub-recipes are never substituted, so they ref directly without an ingredient-concept anchor. No junk concepts ("aromatics for tonkotsu") in the `ingredients` table, no `recipe_produces` rows for components. The two shapes arrive via different authoring gestures: highlight-to-promote creates ingredient refs; "collapse these steps into a sub-recipe" extraction creates direct refs.
- The flattened shopping list is the same graph traversal as before, one join deeper (recipe → steps → refs). Direct refs contribute no line themselves; traversal recurses into the component's own refs.

### `recipe_produces` (junction, unchanged)
Many-to-many. A recipe can produce multiple ingredient concepts.

```
recipe_id
ingredient_id
```

---

## Token Syntax

Step text stores refs as **markdown-link syntax with an ID**:

```
Spread [2 tbsp of peanut butter](ref:01J8X4) on slice
```

Nobody ever types this — it's produced by the highlight-to-promote flow — so it's optimized for surviving edits, not typing ergonomics:

- **Display text lives in the step text**, editable in place. Prose and structured data are allowed to drift: the prose is for humans; the ref row (qty/unit/ingredient_id, parsed once at promote time) feeds the shopping list and scheduler.
- **ID-based, not positional.** `{0}`-style tokens desync when refs are deleted or text is copied between steps. IDs survive any edit, reorder, or paste.
- **Degrades gracefully** — valid-ish markdown, renders as a link elsewhere, greppable, parsed with one regex: `\[([^\]]+)\]\(ref:([A-Za-z0-9]+)\)`.

The renderer replaces each token with: expandable chip (ref has `canonical_recipe_id`), plain pill + swap link (ref has none).

---

## Authoring Flow

Priority order: write flat first, structure later.

1. **User writes a completely flat recipe** — plain numbered steps, no tokens. This must always work; a flat recipe is a valid recipe.
2. **Highlight-to-promote**: user selects a phrase in a step (e.g., "2 tbsp of peanut butter") → "make this an ingredient." Promote-time parse splits the phrase:

   ```
   ^([\d\/.½¼¾\-–\s]+)?\s*(tbsp|tsp|cups?|oz|lbs?|g|ml|slices?|cloves?|...)?\s*(?:of\s+)?(.+)$
   ```

   Group 3 fuzzy-matches against existing ingredient concepts (match → link; miss → create). Show a brief confirm dialog with the parse result — "2 large eggs" and "salt to taste" both pass this regex and only one has a unit.
3. **The token replaces the highlighted span**; a `step_refs` row is created with `canonical_recipe_id = NULL`. Authoring the sub-recipe (the peanut butter recipe itself) can happen now or never — no forced rabbit hole mid-edit.
4. **Suggestion pass (later)**: background regex over step text for `<qty> <unit>? of? <noun>` patterns renders dotted-underline *suggestions*, one tap to confirm, never auto-promoted. The higher-value detector: match step text against the existing ingredient-concept dictionary, so any future recipe mentioning "peanut butter" immediately offers the link. The graph densifies over time without authoring effort.

### Encouraging concise recipes
Target shape: 2–6 steps, short instructions per step. One soft mechanic only: past ~6 steps, surface a gentle "could any of these collapse into a sub-recipe?" hint (consecutive steps sharing an ingredient are the extraction candidates). No hard limits — some recipes (broth) are legitimately six honest steps. The thread renderer itself applies most of the pressure: long flat recipes look bad in a UI built for short nested ones.

---

## The Graph Structure

Recipes form a **directed acyclic graph (DAG)**. Edges are `step_refs.canonical_recipe_id`. This enables:

- Expanding a sub-recipe inline from within a parent recipe's step
- Seeing all recipes that depend on a given component ("uses chili oil")
- Critical path scheduling

**Cycle detection must be enforced on write.** If Recipe A depends on Recipe B which depends on Recipe A, the scheduler breaks.

**Data loading:** fetch the whole resolved tree upfront (one recursive CTE — fine at personal scale) rather than lazy-loading on expand. Makes collapse/expand instant.

---

## Key Behaviors

### Ingredient substitution
When a step calls for "chili oil," the user can:
1. Use a store-bought product (plain ingredient — gray pill)
2. Use the canonical sub-recipe the author linked (purple chip, expandable)
3. "Swap": browse other recipes that produce the same `ingredient_id`

The `ingredient_id` is always the anchor. The canonical recipe is a suggestion, not a requirement.

### Cross-recipe reuse
A recipe like chili oil (`recipe_type: ingredient`) can be made on its own and stored, used as a ref in many dishes, and discovered via "recipes that use chili oil."

### Status pills (deferred)
"have it / make ahead / store-bought" pills shown in the mockup: for v1, derive `make ahead` statically from `time_estimate`; per-user have/need tracking is a **cooking session** concept that lands with the scheduler, not the base recipe view.

### Critical path scheduling
Given a target serve time, work backwards through the ref graph. Each recipe node has a `time_estimate`. Only refs the user marks "make it" (vs. have it / store-bought) contribute to the critical path. Resolve the tree, find the critical path, emit start times per component.

Example for ramen:
- Broth: 6 hours → start at 10am
- Eggs: 20 min → start at 3:40pm
- Tare: 10 min → start at 3:50pm
- Noodles: 15 min → start at 3:45pm
- Assemble: 4:00pm serve

---

## Example: Ramen

| Component | `recipe_type` | Notes |
|---|---|---|
| Tonkotsu broth | ingredient | Its own project, made days ahead; reusable across ramen styles |
| Tare | ingredient | Small but distinct; reusable across ramen styles |
| Chashu pork | ingredient | Reusable in other dishes |
| Marinated soft eggs | ingredient | Reusable topping; itself refs a `component`-type marinade |
| Noodles | ingredient (if homemade) | Or store-bought — ref with no canonical recipe |
| Assembled ramen | dish | 4 steps; refs embedded in step text |

The assembled ramen recipe is four steps. Step 4 ("top with...") carries multiple refs. The complexity lives behind the chips.

## Example: Dan Dan Noodles + Chili Oil

- `chili_oil` recipe: `recipe_type: ingredient`, produces the "chili oil" ingredient concept
- A `dan_dan_noodles` step contains `[2 tbsp chili oil](ref:...)` whose ref row points at the chili oil recipe via `canonical_recipe_id`
- User can expand inline, open as page, or swap to store-bought
- Chili oil's page lists Dan Dan noodles (and others) under "used in"

---

## Open Decisions

- **Drill-in navigation**: stateless for v1 — opening a sub-recipe is just its own page with a "used in" section; no breadcrumb/session state until the scheduler exists.
- **Unit vocabulary** for the promote-time parser — start with a fixed list, extend as real recipes hit misses.

## Scope Notes

- **Personal use only.** No multi-user auth initially. No sharing, no public browsing.
- **Authoring UX can be rough** — but the highlight-to-promote interaction is now load-bearing and must exist in v1 (a crude version is fine).
- **Postgres.** The graph is well-suited to relational with a self-referential junction; no graph DB.
- **Frontend target is the thread renderer** described above; see `recipe-thread-view-mockup.html` for the reference rendering.
