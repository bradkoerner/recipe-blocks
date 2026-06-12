import { AppDataSource } from '../data-source';
import { RecipeStep } from '../entities/RecipeStep';

const repo = () => AppDataSource.getRepository(RecipeStep);

export type RecipeStepCreateInput = {
  recipe_id: string;
  position: number;
  text: string;
};

export const RecipeStepService = {
  findByRecipe(recipeId: string): Promise<RecipeStep[]> {
    return repo().find({
      where: { recipe: { id: recipeId } },
      relations: { refs: { ingredient: true, canonicalRecipe: true } },
      order: { position: 'ASC' },
    });
  },

  findById(id: string): Promise<RecipeStep | null> {
    return repo().findOne({
      where: { id },
      relations: { recipe: true, refs: { ingredient: true, canonicalRecipe: true } },
    });
  },

  create(data: RecipeStepCreateInput): Promise<RecipeStep> {
    const row = repo().create({
      recipe: { id: data.recipe_id },
      position: data.position,
      text: data.text,
    });
    return repo().save(row);
  },

  async update(
    id: string,
    data: Partial<Pick<RecipeStepCreateInput, 'position' | 'text'>>,
  ): Promise<RecipeStep | null> {
    const row = await repo().findOneBy({ id });
    if (!row) return null;
    if (data.position !== undefined) row.position = data.position;
    if (data.text !== undefined) row.text = data.text;
    return repo().save(row);
  },

  async remove(id: string): Promise<boolean> {
    const result = await repo().delete(id);
    return (result.affected ?? 0) > 0;
  },
};
