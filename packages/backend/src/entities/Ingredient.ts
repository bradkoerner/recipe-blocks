import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RecipeIngredient } from './RecipeIngredient';
import { RecipeProduce } from './RecipeProduce';

@Entity('ingredients')
export class Ingredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => RecipeProduce, (rp) => rp.ingredient)
  producedBy: RecipeProduce[];

  @OneToMany(() => RecipeIngredient, (ri) => ri.ingredient)
  usedIn: RecipeIngredient[];
}
