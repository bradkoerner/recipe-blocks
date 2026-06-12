import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RecipeProduce } from './RecipeProduce';
import { StepRef } from './StepRef';

@Entity('ingredients')
export class Ingredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => RecipeProduce, (rp) => rp.ingredient)
  producedBy: RecipeProduce[];

  @OneToMany(() => StepRef, (sr) => sr.ingredient)
  usedIn: StepRef[];
}
