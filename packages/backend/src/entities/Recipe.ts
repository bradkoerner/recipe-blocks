import { Check, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { RecipeType } from '@recipe-blocks/shared';
import { RecipeIngredient } from './RecipeIngredient';
import { RecipeProduce } from './RecipeProduce';

@Entity('recipes')
@Check(`"recipe_type" IN ('component', 'ingredient', 'dish')`)
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer', nullable: true })
  time_estimate: number | null;

  @Column({ type: 'varchar' })
  recipe_type: RecipeType;

  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  @OneToMany(() => RecipeProduce, (rp) => rp.recipe)
  produces: RecipeProduce[];

  @OneToMany(() => RecipeIngredient, (ri) => ri.parentRecipe)
  ingredients: RecipeIngredient[];
}
