import { Router } from 'express';
import {
  isCycleError,
  isProducesError,
  isShapeError,
  StepRefService,
} from '../services/StepRefService';

export const stepRefsRouter = Router();

// GET /step-refs?stepId=<uuid>
stepRefsRouter.get('/', async (req, res) => {
  const { stepId } = req.query;
  if (typeof stepId !== 'string') {
    res.status(400).json({ error: 'stepId query param is required' });
    return;
  }
  const rows = await StepRefService.findByStep(stepId);
  res.json(rows);
});

stepRefsRouter.get('/:id', async (req, res) => {
  const row = await StepRefService.findById(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(row);
});

stepRefsRouter.post('/', async (req, res) => {
  const { step_id, ingredient_id, canonical_recipe_id, quantity, unit } =
    req.body as Record<string, unknown>;

  if (typeof step_id !== 'string' || !step_id) {
    res.status(400).json({ error: 'step_id is required' });
    return;
  }

  const result = await StepRefService.create({
    step_id,
    ingredient_id: typeof ingredient_id === 'string' ? ingredient_id : null,
    canonical_recipe_id: typeof canonical_recipe_id === 'string' ? canonical_recipe_id : null,
    quantity: typeof quantity === 'string' ? quantity.trim() : null,
    unit: typeof unit === 'string' ? unit : null,
  });

  if (result === null) {
    res.status(404).json({ error: 'Step not found' });
    return;
  }
  if (isShapeError(result)) {
    res.status(400).json({ error: 'At least one of ingredient_id or canonical_recipe_id is required' });
    return;
  }
  if (isProducesError(result)) {
    res.status(422).json({ error: 'Canonical recipe does not produce the required ingredient' });
    return;
  }
  if (isCycleError(result)) {
    res.status(409).json({ error: 'This ref would create a cycle in the recipe graph' });
    return;
  }
  res.status(201).json(result);
});

// PATCH /step-refs/:id — update quantity/unit only
stepRefsRouter.patch('/:id', async (req, res) => {
  const { quantity, unit } = req.body as Record<string, unknown>;
  const update: { quantity?: string | null; unit?: string | null } = {};

  if (quantity !== undefined) {
    update.quantity = typeof quantity === 'string' && quantity.trim() ? quantity.trim() : null;
  }
  if (unit !== undefined) {
    update.unit = typeof unit === 'string' ? unit : null;
  }

  const row = await StepRefService.update(req.params.id, update);
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(row);
});

// PATCH /step-refs/:id/canonical — set canonical_recipe_id with cycle check
stepRefsRouter.patch('/:id/canonical', async (req, res) => {
  const { canonical_recipe_id } = req.body as Record<string, unknown>;
  const canonicalId =
    typeof canonical_recipe_id === 'string' ? canonical_recipe_id : null;

  const result = await StepRefService.setCanonicalRecipe(req.params.id, canonicalId);

  if (result === null) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (isShapeError(result)) {
    res.status(400).json({ error: 'A direct ref cannot drop its recipe — delete the ref instead' });
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

stepRefsRouter.delete('/:id', async (req, res) => {
  const deleted = await StepRefService.remove(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).send();
});
