import { Check, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { RecipeType } from '@recipe-blocks/shared';
import { RecipeProduce } from './RecipeProduce';
import { RecipeStep } from './RecipeStep';

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

  // Feeds the expanded-chip metadata line ("makes 1.5 qt · 6h").
  // Property of one batch, not of each produced concept. No scaling in v1.
  @Column({ type: 'varchar', nullable: true })
  yield_amount: string | null;

  @Column({ type: 'varchar', nullable: true })
  yield_unit: string | null;

  @OneToMany(() => RecipeProduce, (rp) => rp.recipe)
  produces: RecipeProduce[];

  @OneToMany(() => RecipeStep, (rs) => rs.recipe)
  steps: RecipeStep[];
}
