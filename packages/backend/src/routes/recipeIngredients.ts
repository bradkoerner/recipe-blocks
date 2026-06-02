import { Router } from 'express';
import { isCycleError, isProducesError, RecipeIngredientService } from '../services/RecipeIngredientService';

export const recipeIngredientsRouter = Router();

// GET /recipe-ingredients?recipeId=<uuid>
recipeIngredientsRouter.get('/', async (req, res) => {
  const { recipeId } = req.query;
  if (typeof recipeId !== 'string') {
    res.status(400).json({ error: 'recipeId query param is required' });
    return;
  }
  const rows = await RecipeIngredientService.findByRecipe(recipeId);
  res.json(rows);
});

recipeIngredientsRouter.get('/:id', async (req, res) => {
  const row = await RecipeIngredientService.findById(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(row);
});

recipeIngredientsRouter.post('/', async (req, res) => {
  const { parent_recipe_id, ingredient_id, quantity, unit } =
    req.body as Record<string, unknown>;

  if (typeof parent_recipe_id !== 'string' || !parent_recipe_id) {
    res.status(400).json({ error: 'parent_recipe_id is required' });
    return;
  }
  if (typeof ingredient_id !== 'string' || !ingredient_id) {
    res.status(400).json({ error: 'ingredient_id is required' });
    return;
  }
  if (typeof quantity !== 'string' || !quantity.trim()) {
    res.status(400).json({ error: 'quantity is required' });
    return;
  }

  const result = await RecipeIngredientService.create({
    parent_recipe_id,
    ingredient_id,
    quantity: quantity.trim(),
    unit: typeof unit === 'string' ? unit : null,
  });

  res.status(201).json(result);
});

// PATCH /recipe-ingredients/:id — update quantity/unit only
recipeIngredientsRouter.patch('/:id', async (req, res) => {
  const { quantity, unit } = req.body as Record<string, unknown>;
  const update: { quantity?: string; unit?: string | null } = {};

  if (quantity !== undefined) {
    if (typeof quantity !== 'string' || !quantity.trim()) {
      res.status(400).json({ error: 'quantity must be a non-empty string' });
      return;
    }
    update.quantity = quantity.trim();
  }
  if (unit !== undefined) {
    update.unit = typeof unit === 'string' ? unit : null;
  }

  const row = await RecipeIngredientService.update(req.params.id, update);
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(row);
});

// PATCH /recipe-ingredients/:id/canonical — set canonical_recipe_id with cycle check
recipeIngredientsRouter.patch('/:id/canonical', async (req, res) => {
  const { canonical_recipe_id } = req.body as Record<string, unknown>;
  const canonicalId =
    typeof canonical_recipe_id === 'string' ? canonical_recipe_id : null;

  const result = await RecipeIngredientService.setCanonicalRecipe(req.params.id, canonicalId);

  if (result === null) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (isProducesError(result)) {
    res.status(422).json({ error: 'Canonical recipe does not produce the required ingredient' });
    return;
  }
  if (isCycleError(result)) {
    res.status(409).json({ error: 'Setting this canonical recipe would create a cycle in the recipe graph' });
    return;
  }
  res.json(result);
});

recipeIngredientsRouter.delete('/:id', async (req, res) => {
  const deleted = await RecipeIngredientService.remove(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).send();
});
