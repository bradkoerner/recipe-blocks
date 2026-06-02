import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ingredient } from './Ingredient';
import { Recipe } from './Recipe';

@Entity('recipe_ingredients')
export class RecipeIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Recipe, (r) => r.ingredients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_recipe_id' })
  parentRecipe: Recipe;

  @ManyToOne(() => Ingredient, (i) => i.usedIn, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;

  // Specific sub-recipe the author recommends for this ingredient.
  // Must produce ingredient_id — enforced at app level, not DB level.
  @ManyToOne(() => Recipe, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'canonical_recipe_id' })
  canonicalRecipe: Recipe | null;

  @Column({ type: 'varchar' })
  quantity: string;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;
}
