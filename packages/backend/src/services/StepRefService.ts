import { AppDataSource } from '../data-source';
import { StepRef } from '../entities/StepRef';
import { RecipeStep } from '../entities/RecipeStep';
import { wouldCreateCycle } from './cycleDetection';
import { RecipeProduceService } from './RecipeProduceService';

const repo = () => AppDataSource.getRepository(StepRef);

export type StepRefCreateInput = {
  step_id: string;
  ingredient_id?: string | null;
  canonical_recipe_id?: string | null;
  quantity?: string | null;
  unit?: string | null;
};

export type CycleError = { cycle: true };
export type ProducesError = { doesNotProduce: true };
export type ShapeError = { invalidShape: true };
export const isCycleError = (v: unknown): v is CycleError =>
  typeof v === 'object' && v !== null && (v as CycleError).cycle === true;
export const isProducesError = (v: unknown): v is ProducesError =>
  typeof v === 'object' && v !== null && (v as ProducesError).doesNotProduce === true;
export const isShapeError = (v: unknown): v is ShapeError =>
  typeof v === 'object' && v !== null && (v as ShapeError).invalidShape === true;

async function stepRecipeId(stepId: string): Promise<string | null> {
  const step = await AppDataSource.getRepository(RecipeStep).findOne({
    where: { id: stepId },
    relations: { recipe: true },
  });
  return step?.recipe.id ?? null;
}

export const StepRefService = {
  findByStep(stepId: string): Promise<StepRef[]> {
    return repo().find({
      where: { step: { id: stepId } },
      relations: { ingredient: true, canonicalRecipe: true },
    });
  },

  findById(id: string): Promise<StepRef | null> {
    return repo().findOne({
      where: { id },
      relations: { ingredient: true, canonicalRecipe: true, step: { recipe: true } },
    });
  },

  async create(
    data: StepRefCreateInput,
  ): Promise<StepRef | CycleError | ProducesError | ShapeError | null> {
    const ingredientId = data.ingredient_id ?? null;
    const canonicalId = data.canonical_recipe_id ?? null;

    if (!ingredientId && !canonicalId) return { invalidShape: true };

    if (canonicalId) {
      const recipeId = await stepRecipeId(data.step_id);
      if (!recipeId) return null;

      if (ingredientId) {
        const produces = await RecipeProduceService.exists(canonicalId, ingredientId);
        if (!produces) return { doesNotProduce: true };
      }

      const cycle = await wouldCreateCycle(recipeId, canonicalId);
      if (cycle) return { cycle: true };
    }

    const row = repo().create({
      step: { id: data.step_id },
      ingredient: ingredientId ? { id: ingredientId } : null,
      canonicalRecipe: canonicalId ? { id: canonicalId } : null,
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
    });
    return repo().save(row);
  },

  async setCanonicalRecipe(
    id: string,
    canonicalRecipeId: string | null,
  ): Promise<StepRef | CycleError | ProducesError | ShapeError | null> {
    const row = await repo().findOne({
      where: { id },
      relations: { ingredient: true, step: { recipe: true } },
    });
    if (!row) return null;

    if (canonicalRecipeId === null) {
      // A direct ref is nothing without its recipe — delete it instead.
      if (!row.ingredient) return { invalidShape: true };
    } else {
      if (row.ingredient) {
        const produces = await RecipeProduceService.exists(canonicalRecipeId, row.ingredient.id);
        if (!produces) return { doesNotProduce: true };
      }

      const cycle = await wouldCreateCycle(row.step.recipe.id, canonicalRecipeId);
      if (cycle) return { cycle: true };
    }

    row.canonicalRecipe = canonicalRecipeId ? ({ id: canonicalRecipeId } as never) : null;
    return repo().save(row);
  },

  async update(
    id: string,
    data: Partial<Pick<StepRefCreateInput, 'quantity' | 'unit'>>,
  ): Promise<StepRef | null> {
    const row = await repo().findOneBy({ id });
    if (!row) return null;
    if (data.quantity !== undefined) row.quantity = data.quantity ?? null;
    if (data.unit !== undefined) row.unit = data.unit ?? null;
    return repo().save(row);
  },

  async remove(id: string): Promise<boolean> {
    const result = await repo().delete(id);
    return (result.affected ?? 0) > 0;
  },
};
