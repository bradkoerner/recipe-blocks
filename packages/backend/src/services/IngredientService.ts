import { AppDataSource } from '../data-source';
import { Ingredient } from '../entities/Ingredient';

const repo = () => AppDataSource.getRepository(Ingredient);

export const IngredientService = {
  findAll(): Promise<Ingredient[]> {
    return repo().find();
  },

  findById(id: string): Promise<Ingredient | null> {
    return repo().findOneBy({ id });
  },

  create(name: string): Promise<Ingredient> {
    return repo().save(repo().create({ name }));
  },

  async update(id: string, name: string): Promise<Ingredient | null> {
    const ingredient = await repo().findOneBy({ id });
    if (!ingredient) return null;
    ingredient.name = name;
    return repo().save(ingredient);
  },

  async remove(id: string): Promise<boolean> {
    const result = await repo().delete(id);
    return (result.affected ?? 0) > 0;
  },
};
