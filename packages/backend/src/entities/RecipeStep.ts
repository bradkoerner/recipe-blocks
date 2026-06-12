import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Recipe } from './Recipe';
import { StepRef } from './StepRef';

@Entity('recipe_steps')
export class RecipeStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Recipe, (r) => r.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @Column({ type: 'integer' })
  position: number;

  // Prose with inline [display text](ref:ID) tokens. Display text may drift
  // from the structured ref row — the prose is for humans, the ref row feeds
  // the shopping list and scheduler.
  @Column({ type: 'text' })
  text: string;

  @OneToMany(() => StepRef, (sr) => sr.step)
  refs: StepRef[];
}
