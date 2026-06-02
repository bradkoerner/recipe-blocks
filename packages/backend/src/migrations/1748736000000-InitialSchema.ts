import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1748736000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ingredients" (
        "id"   uuid        NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar     NOT NULL,
        CONSTRAINT "PK_ingredients" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "recipes" (
        "id"            uuid        NOT NULL DEFAULT gen_random_uuid(),
        "name"          varchar     NOT NULL,
        "description"   text,
        "time_estimate" integer,
        "recipe_type"   varchar     NOT NULL,
        "instructions"  text,
        CONSTRAINT "PK_recipes"          PRIMARY KEY ("id"),
        CONSTRAINT "CHK_recipe_type"     CHECK (recipe_type IN ('component', 'ingredient', 'dish'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "recipe_produces" (
        "recipe_id"     uuid NOT NULL,
        "ingredient_id" uuid NOT NULL,
        CONSTRAINT "PK_recipe_produces" PRIMARY KEY ("recipe_id", "ingredient_id"),
        CONSTRAINT "FK_recipe_produces_recipe"
          FOREIGN KEY ("recipe_id")     REFERENCES "recipes"("id")     ON DELETE CASCADE,
        CONSTRAINT "FK_recipe_produces_ingredient"
          FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "recipe_ingredients" (
        "id"                  uuid    NOT NULL DEFAULT gen_random_uuid(),
        "parent_recipe_id"    uuid    NOT NULL,
        "ingredient_id"       uuid    NOT NULL,
        "canonical_recipe_id" uuid,
        "quantity"            varchar NOT NULL,
        "unit"                varchar,
        CONSTRAINT "PK_recipe_ingredients" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recipe_ingredients_parent"
          FOREIGN KEY ("parent_recipe_id")    REFERENCES "recipes"("id")     ON DELETE CASCADE,
        CONSTRAINT "FK_recipe_ingredients_ingredient"
          FOREIGN KEY ("ingredient_id")       REFERENCES "ingredients"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_recipe_ingredients_canonical"
          FOREIGN KEY ("canonical_recipe_id") REFERENCES "recipes"("id")     ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "recipe_ingredients"`);
    await queryRunner.query(`DROP TABLE "recipe_produces"`);
    await queryRunner.query(`DROP TABLE "recipes"`);
    await queryRunner.query(`DROP TABLE "ingredients"`);
  }
}
