import { Router } from 'express';
import { RecipeProduceService } from '../services/RecipeProduceService';

export const recipeProducesRouter = Router();

// GET /recipe-produces?recipeId=<uuid>  OR  ?ingredientId=<uuid>
recipeProducesRouter.get('/', async (req, res) => {
  const { recipeId, ingredientId } = req.query;

  if (typeof recipeId === 'string') {
    res.json(await RecipeProduceService.findByRecipe(recipeId));
    return;
  }
  if (typeof ingredientId === 'string') {
    res.json(await RecipeProduceService.findByIngredient(ingredientId));
    return;
  }

  res.status(400).json({ error: 'recipeId or ingredientId query param is required' });
});

recipeProducesRouter.post('/', async (req, res) => {
  const { recipe_id, ingredient_id } = req.body as Record<string, unknown>;

  if (typeof recipe_id !== 'string' || !recipe_id) {
    res.status(400).json({ error: 'recipe_id is required' });
    return;
  }
  if (typeof ingredient_id !== 'string' || !ingredient_id) {
    res.status(400).json({ error: 'ingredient_id is required' });
    return;
  }

  const already = await RecipeProduceService.exists(recipe_id, ingredient_id);
  if (already) {
    res.status(409).json({ error: 'This recipe already produces that ingredient' });
    return;
  }

  const row = await RecipeProduceService.create(recipe_id, ingredient_id);
  res.status(201).json(row);
});

// DELETE /recipe-produces/:recipeId/:ingredientId
recipeProducesRouter.delete('/:recipeId/:ingredientId', async (req, res) => {
  const deleted = await RecipeProduceService.remove(
    req.params.recipeId,
    req.params.ingredientId,
  );
  if (!deleted) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).send();
});
