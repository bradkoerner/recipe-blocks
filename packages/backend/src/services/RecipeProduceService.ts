import { AppDataSource } from '../data-source';
import { RecipeProduce } from '../entities/RecipeProduce';

const repo = () => AppDataSource.getRepository(RecipeProduce);

export const RecipeProduceService = {
  findByRecipe(recipeId: string): Promise<RecipeProduce[]> {
    return repo().find({
      where: { recipe_id: recipeId },
      relations: { ingredient: true },
    });
  },

  findByIngredient(ingredientId: string): Promise<RecipeProduce[]> {
    return repo().find({
      where: { ingredient_id: ingredientId },
      relations: { recipe: true },
    });
  },

  exists(recipeId: string, ingredientId: string): Promise<boolean> {
    return repo()
      .countBy({ recipe_id: recipeId, ingredient_id: ingredientId })
      .then((n) => n > 0);
  },

  async create(recipeId: string, ingredientId: string): Promise<RecipeProduce> {
    const row = repo().create({ recipe_id: recipeId, ingredient_id: ingredientId });
    return repo().save(row);
  },

  async remove(recipeId: string, ingredientId: string): Promise<boolean> {
    const result = await repo().delete({ recipe_id: recipeId, ingredient_id: ingredientId });
    return (result.affected ?? 0) > 0;
  },
};
