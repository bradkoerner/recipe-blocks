import { BeforeInsert, Check, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ulid } from 'ulid';
import { Ingredient } from './Ingredient';
import { Recipe } from './Recipe';
import { RecipeStep } from './RecipeStep';

// The DAG edges. Three valid shapes:
//   ingredient only          → plain ingredient (gray pill + swap)
//   ingredient + canonical   → anchored recipe ref (purple chip + swap)
//   canonical only           → direct ref to a component-type sub-recipe (chip, no swap)
@Entity('step_refs')
@Check(`"ingredient_id" IS NOT NULL OR "canonical_recipe_id" IS NOT NULL`)
export class StepRef {
  // ULID, referenced by the token in step text: [display text](ref:ID)
  @PrimaryColumn({ type: 'varchar', length: 26 })
  id: string;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) this.id = ulid();
  }

  @ManyToOne(() => RecipeStep, (s) => s.refs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'step_id' })
  step: RecipeStep;

  @ManyToOne(() => Ingredient, (i) => i.usedIn, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient | null;

  // When ingredient is set, must reference a recipe that produces it —
  // enforced at app level, not DB level.
  @ManyToOne(() => Recipe, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'canonical_recipe_id' })
  canonicalRecipe: Recipe | null;

  // Nullable: direct refs carry no quantity (the parent step's text does),
  // and "salt to taste" has none either.
  @Column({ type: 'varchar', nullable: true })
  quantity: string | null;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;
}
