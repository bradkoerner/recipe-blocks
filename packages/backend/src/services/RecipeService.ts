import type { RecipeType } from '@recipe-blocks/shared';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Recipe } from '../entities/Recipe';
import { StepRef } from '../entities/StepRef';

const repo = () => AppDataSource.getRepository(Recipe);

export type RecipeCreateInput = {
  name: string;
  recipe_type: RecipeType;
  description?: string | null;
  time_estimate?: number | null;
  yield_amount?: string | null;
  yield_unit?: string | null;
};

export type RecipeUpdateInput = Partial<RecipeCreateInput>;

const RECIPE_TYPES: RecipeType[] = ['component', 'ingredient', 'dish'];

export const isRecipeType = (v: unknown): v is RecipeType =>
  RECIPE_TYPES.includes(v as RecipeType);

export const RecipeService = {
  findAll(type?: RecipeType): Promise<Recipe[]> {
    return type ? repo().findBy({ recipe_type: type }) : repo().find();
  },

  findById(id: string): Promise<Recipe | null> {
    return repo().findOne({
      where: { id },
      relations: {
        produces: { ingredient: true },
        steps: { refs: { ingredient: true, canonicalRecipe: true } },
      },
      order: { steps: { position: 'ASC' } },
    });
  },

  create(data: RecipeCreateInput): Promise<Recipe> {
    return repo().save(repo().create(data));
  },

  async update(id: string, data: RecipeUpdateInput): Promise<Recipe | null> {
    const recipe = await repo().findOneBy({ id });
    if (!recipe) return null;
    Object.assign(recipe, data);
    return repo().save(recipe);
  },

  async remove(id: string): Promise<boolean> {
    return AppDataSource.transaction(async (manager) => {
      // Direct refs (no ingredient anchor) are meaningless without their
      // recipe, and FK SET NULL would violate the at-least-one check —
      // delete them; anchored refs degrade to plain pills via SET NULL.
      await manager.delete(StepRef, {
        canonicalRecipe: { id },
        ingredient: IsNull(),
      });
      const result = await manager.delete(Recipe, id);
      return (result.affected ?? 0) > 0;
    });
  },
};
