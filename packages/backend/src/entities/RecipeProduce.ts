import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Ingredient } from './Ingredient';
import { Recipe } from './Recipe';

@Entity('recipe_produces')
export class RecipeProduce {
  @PrimaryColumn('uuid')
  recipe_id: string;

  @PrimaryColumn('uuid')
  ingredient_id: string;

  @ManyToOne(() => Recipe, (r) => r.produces)
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @ManyToOne(() => Ingredient, (i) => i.producedBy)
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;
}
