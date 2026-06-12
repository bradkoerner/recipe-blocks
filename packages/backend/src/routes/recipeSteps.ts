import { Router } from 'express';
import { RecipeStepService } from '../services/RecipeStepService';

export const recipeStepsRouter = Router();

// GET /recipe-steps?recipeId=<uuid> — ordered by position, refs included
recipeStepsRouter.get('/', async (req, res) => {
  const { recipeId } = req.query;
  if (typeof recipeId !== 'string') {
    res.status(400).json({ error: 'recipeId query param is required' });
    return;
  }
  const rows = await RecipeStepService.findByRecipe(recipeId);
  res.json(rows);
});

recipeStepsRouter.get('/:id', async (req, res) => {
  const row = await RecipeStepService.findById(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(row);
});

recipeStepsRouter.post('/', async (req, res) => {
  const { recipe_id, position, text } = req.body as Record<string, unknown>;

  if (typeof recipe_id !== 'string' || !recipe_id) {
    res.status(400).json({ error: 'recipe_id is required' });
    return;
  }
  if (typeof position !== 'number' || !Number.isInteger(position)) {
    res.status(400).json({ error: 'position must be an integer' });
    return;
  }
  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const row = await RecipeStepService.create({ recipe_id, position, text });
  res.status(201).json(row);
});

recipeStepsRouter.patch('/:id', async (req, res) => {
  const { position, text } = req.body as Record<string, unknown>;
  const update: { position?: number; text?: string } = {};

  if (position !== undefined) {
    if (typeof position !== 'number' || !Number.isInteger(position)) {
      res.status(400).json({ error: 'position must be an integer' });
      return;
    }
    update.position = position;
  }
  if (text !== undefined) {
    if (typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'text must be a non-empty string' });
      return;
    }
    update.text = text;
  }

  const row = await RecipeStepService.update(req.params.id, update);
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(row);
});

recipeStepsRouter.delete('/:id', async (req, res) => {
  const deleted = await RecipeStepService.remove(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).send();
});
