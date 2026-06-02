import { Router } from 'express';
import { IngredientService } from '../services/IngredientService';

export const ingredientsRouter = Router();

ingredientsRouter.get('/', async (_req, res) => {
  const ingredients = await IngredientService.findAll();
  res.json(ingredients);
});

ingredientsRouter.get('/:id', async (req, res) => {
  const ingredient = await IngredientService.findById(req.params.id);
  if (!ingredient) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(ingredient);
});

ingredientsRouter.post('/', async (req, res) => {
  const { name } = req.body as { name: unknown };
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const ingredient = await IngredientService.create(name.trim());
  res.status(201).json(ingredient);
});

ingredientsRouter.patch('/:id', async (req, res) => {
  const { name } = req.body as { name: unknown };
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const ingredient = await IngredientService.update(req.params.id, name.trim());
  if (!ingredient) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(ingredient);
});

ingredientsRouter.delete('/:id', async (req, res) => {
  const deleted = await IngredientService.remove(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).send();
});
