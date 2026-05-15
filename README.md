# Recipe App — Project Specification

## Concept

A personal recipe management app built around the idea that recipes are made of **building blocks**, not flat lists of ingredients and instructions. The core insight is that cooking involves composable components — a sauce, a marinade, a spice blend — that can be prepared separately, reused across dishes, and understood independently.

The app solves a real friction point: the constant back-and-forth between an ingredient list and a step list while cooking. Instead, ingredients and instructions are grouped together at the component level. You see the sauce ingredients alongside the sauce instructions. You see the marinade ingredients alongside the marinade instructions. The final recipe just assembles the components.

---

## Core Data Model

### `ingredients`
The concept of a real-world ingredient — "chili oil," "soy sauce," "garlic." This is the anchor for substitution and cross-referencing.

```
id
name
```

### `recipes`
Both full recipes and sub-components are stored here with the same structure. The `recipe_type` field distinguishes how they are used and surfaced.

```
id
name
description
time_estimate        ← used for critical path scheduling
recipe_type          ← varchar: component | ingredient | dish (check constraint, not a Postgres enum)
instructions         ← scoped to this recipe/component only
```

**`recipe_type` values:**
- `component` — exists only within a parent recipe, never browsed independently (e.g., aromatics for a specific dish)
- `ingredient` — standalone producible thing, reusable across recipes, but not something you'd eat on its own (e.g., chili oil, stocks, spice blends)
- `dish` — self-contained recipe you'd browse when deciding what to make (e.g., Dan dan noodles, roast broccoli)

### `recipe_produces` (junction)
Many-to-many. A recipe can produce multiple ingredient concepts. A barbecue sauce recipe might produce "barbecue sauce," "glaze," and "wing sauce."

```
recipe_id
ingredient_id
```

### `recipe_ingredients`
The edges of the graph. Each row says: "this recipe needs this ingredient concept, in this quantity."

```
id
parent_recipe_id     ← the recipe being built
ingredient_id        ← the ingredient concept required (e.g., "chili oil")
canonical_recipe_id  ← (optional) the specific sub-recipe the author recommends
quantity
unit
```

**Note:** `canonical_recipe_id` should reference a recipe that produces `ingredient_id`. Enforced at the application level.

---

## The Graph Structure

Recipes form a **directed acyclic graph (DAG)**. A recipe node can depend on other recipe nodes via `recipe_ingredients.canonical_recipe_id`. This enables:

- Drilling into a component recipe from within a parent recipe
- Seeing all recipes that depend on a given component
- Critical path scheduling (see below)

**Cycle detection must be enforced on write.** If Recipe A depends on Recipe B which depends on Recipe A, the scheduler breaks.

---

## Key Behaviors

### Ingredient substitution
When a recipe calls for "chili oil," the user can:
1. Use a store-bought product (treat it as a plain ingredient)
2. Use the canonical sub-recipe the author linked
3. Browse other recipes in the database that produce "chili oil"

The `ingredient_id` is always the anchor. The canonical recipe is a suggestion, not a requirement.

### Cross-recipe reuse
A recipe like chili oil (`recipe_type: ingredient`) can be:
- Made on its own and stored
- Used as a component in Dan dan noodles, mapo tofu, etc.
- Discovered via "recipes that use chili oil"

### Component vs. ingredient vs. dish
Aromatics for a specific dish are a `recipe` row with `recipe_type: component`. They have their own ingredients and instructions, which keeps the parent recipe clean, but they never surface in browsing. Chili oil is `recipe_type: ingredient` — browseable and reusable, but not something you'd eat on its own. Dan dan noodles is `recipe_type: dish` — what shows up when you're deciding what to make tonight. If a component turns out to be useful on its own, just change the type.

### Critical path scheduling
Given a target serve time, the app should work backwards through the dependency graph to produce a prep schedule. Each recipe node has a `time_estimate`. The scheduler resolves the dependency tree, finds the critical path, and tells the user when to start each component.

Example for ramen:
- Broth: 6 hours → start at 10am
- Eggs: 20 min → start at 3:40pm
- Tare: 10 min → start at 3:50pm
- Noodles: 15 min → start at 3:45pm
- Assemble: 4:00pm serve

---

## Example: Ramen

Ramen is the canonical use case for this app. A ramen recipe on a typical cooking site is one giant flat list. Here it becomes:

| Component | `recipe_type` | Notes |
|---|---|---|
| Tonkotsu broth | ingredient | Its own project, can be made days ahead; reusable across ramen styles |
| Tare | ingredient | Small but distinct; reusable across ramen styles |
| Chashu pork | ingredient | Reusable in other dishes |
| Marinated soft eggs | ingredient | Reusable topping |
| Noodles | ingredient (if homemade) | Or just use store-bought |
| Assembled ramen | dish | Parent recipe; components listed as ingredients with canonical links |

The assembled ramen recipe's ingredient list is essentially: broth, tare, chashu, eggs, noodles, toppings. Its instructions are: combine in bowl. The complexity lives in the components.

---

## Example: Dan Dan Noodles + Chili Oil

- `chili_oil` recipe: `recipe_type: ingredient`, produces the "chili oil" ingredient concept
- `dan_dan_noodles` recipe: has a `recipe_ingredients` row for "chili oil" with `canonical_recipe_id` pointing to the chili oil recipe
- User making Dan Dan can drill into chili oil, see the canonical recipe, or swap in store-bought
- User who has made chili oil can see Dan Dan noodles (and other recipes) listed as "uses chili oil"

---

## Scope Notes

- **Personal use only.** No multi-user auth required initially. No sharing, no public browsing.
- **Authoring UX can be rough.** The priority is the cooking/execution experience — the "I'm making this tonight" view. Authoring just needs to work, not be polished.
- **Stack TBD**, but Postgres is the right database. The graph structure is well-suited to relational with a self-referential junction table. No need for a dedicated graph DB.
- **Frontend will be the hard part.** Rendering nested recipe trees in a usable cooking interface is the main UI challenge. Start simple.
