import { Router } from 'express';
import { isRecipeType, RecipeService } from '../services/RecipeService';
import type { RecipeCreateInput } from '../services/RecipeService';

export const recipesRouter = Router();

recipesRouter.get('/', async (req, res) => {
  const { type } = req.query;
  if (type !== undefined && !isRecipeType(type)) {
    res.status(400).json({ error: 'invalid recipe_type' });
    return;
  }
  const recipes = await RecipeService.findAll(type);
  res.json(recipes);
});

recipesRouter.get('/:id', async (req, res) => {
  const recipe = await RecipeService.findById(req.params.id);
  if (!recipe) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(recipe);
});

recipesRouter.post('/', async (req, res) => {
  const { name, recipe_type, description, time_estimate, yield_amount, yield_unit } =
    req.body as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!isRecipeType(recipe_type)) {
    res.status(400).json({ error: 'recipe_type must be component, ingredient, or dish' });
    return;
  }

  const data: RecipeCreateInput = {
    name: name.trim(),
    recipe_type,
    description: typeof description === 'string' ? description : null,
    time_estimate: typeof time_estimate === 'number' ? time_estimate : null,
    yield_amount: typeof yield_amount === 'string' ? yield_amount : null,
    yield_unit: typeof yield_unit === 'string' ? yield_unit : null,
  };

  const recipe = await RecipeService.create(data);
  res.status(201).json(recipe);
});

recipesRouter.patch('/:id', async (req, res) => {
  const { name, recipe_type, description, time_estimate, yield_amount, yield_unit } =
    req.body as Record<string, unknown>;

  const update: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name must be a non-empty string' });
      return;
    }
    update.name = name.trim();
  }
  if (recipe_type !== undefined) {
    if (!isRecipeType(recipe_type)) {
      res.status(400).json({ error: 'recipe_type must be component, ingredient, or dish' });
      return;
    }
    update.recipe_type = recipe_type;
  }
  if (description !== undefined) update.description = typeof description === 'string' ? description : null;
  if (time_estimate !== undefined) update.time_estimate = typeof time_estimate === 'number' ? time_estimate : null;
  if (yield_amount !== undefined) update.yield_amount = typeof yield_amount === 'string' ? yield_amount : null;
  if (yield_unit !== undefined) update.yield_unit = typeof yield_unit === 'string' ? yield_unit : null;

  const recipe = await RecipeService.update(req.params.id, update);
  if (!recipe) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(recipe);
});

recipesRouter.delete('/:id', async (req, res) => {
  const deleted = await RecipeService.remove(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).send();
});
