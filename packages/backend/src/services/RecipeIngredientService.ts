import { AppDataSource } from '../data-source';
import { RecipeIngredient } from '../entities/RecipeIngredient';
import { wouldCreateCycle } from './cycleDetection';
import { RecipeProduceService } from './RecipeProduceService';

const repo = () => AppDataSource.getRepository(RecipeIngredient);

export type RecipeIngredientCreateInput = {
  parent_recipe_id: string;
  ingredient_id: string;
  quantity: string;
  unit?: string | null;
};

export type CycleError = { cycle: true };
export type ProducesError = { doesNotProduce: true };
export const isCycleError = (v: unknown): v is CycleError =>
  typeof v === 'object' && v !== null && (v as CycleError).cycle === true;
export const isProducesError = (v: unknown): v is ProducesError =>
  typeof v === 'object' && v !== null && (v as ProducesError).doesNotProduce === true;

export const RecipeIngredientService = {
  findByRecipe(parentRecipeId: string): Promise<RecipeIngredient[]> {
    return repo().find({
      where: { parentRecipe: { id: parentRecipeId } },
      relations: { ingredient: true, canonicalRecipe: true },
    });
  },

  findById(id: string): Promise<RecipeIngredient | null> {
    return repo().findOne({
      where: { id },
      relations: { ingredient: true, canonicalRecipe: true, parentRecipe: true },
    });
  },

  async create(
    data: RecipeIngredientCreateInput,
  ): Promise<RecipeIngredient | CycleError> {
    // No canonical_recipe_id at creation time, so no cycle risk yet.
    const row = repo().create({
      parentRecipe: { id: data.parent_recipe_id },
      ingredient: { id: data.ingredient_id },
      quantity: data.quantity,
      unit: data.unit ?? null,
    });
    return repo().save(row);
  },

  async setCanonicalRecipe(
    id: string,
    canonicalRecipeId: string | null,
  ): Promise<RecipeIngredient | CycleError | ProducesError | null> {
    const row = await repo().findOne({
      where: { id },
      relations: { parentRecipe: true, ingredient: true },
    });
    if (!row) return null;

    if (canonicalRecipeId !== null) {
      const produces = await RecipeProduceService.exists(canonicalRecipeId, row.ingredient.id);
      if (!produces) return { doesNotProduce: true };

      const cycle = await wouldCreateCycle(row.parentRecipe.id, canonicalRecipeId);
      if (cycle) return { cycle: true };
    }

    row.canonicalRecipe = canonicalRecipeId ? { id: canonicalRecipeId } as never : null;
    return repo().save(row);
  },

  async update(
    id: string,
    data: Partial<Pick<RecipeIngredientCreateInput, 'quantity' | 'unit'>>,
  ): Promise<RecipeIngredient | null> {
    const row = await repo().findOneBy({ id });
    if (!row) return null;
    if (data.quantity !== undefined) row.quantity = data.quantity;
    if (data.unit !== undefined) row.unit = data.unit ?? null;
    return repo().save(row);
  },

  async remove(id: string): Promise<boolean> {
    const result = await repo().delete(id);
    return (result.affected ?? 0) > 0;
  },
};
