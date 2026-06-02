import { AppDataSource } from '../data-source';
import { RecipeIngredient } from '../entities/RecipeIngredient';
import { RecipeProduce } from '../entities/RecipeProduce';

// Build adjacency map: recipeId -> set of recipeIds it depends on.
// An edge exists when a recipe_ingredient row has a canonical_recipe_id,
// meaning parentRecipe depends on canonicalRecipe.
async function buildAdjacency(): Promise<Map<string, Set<string>>> {
  const edges = await AppDataSource.getRepository(RecipeIngredient).find({
    relations: { parentRecipe: true, canonicalRecipe: true },
  });

  const adj = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!edge.canonicalRecipe) continue;
    const from = edge.parentRecipe.id;
    const to = edge.canonicalRecipe.id;
    if (!adj.has(from)) adj.set(from, new Set());
    adj.get(from)!.add(to);
  }
  return adj;
}

// DFS from `start`, returns true if `target` is reachable.
function isReachable(adj: Map<string, Set<string>>, start: string, target: string): boolean {
  const visited = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === target) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const neighbor of adj.get(node) ?? []) {
      stack.push(neighbor);
    }
  }
  return false;
}

// Returns true if adding edge (from -> to) would create a cycle.
// A cycle exists if `from` is already reachable from `to`.
export async function wouldCreateCycle(fromRecipeId: string, toRecipeId: string): Promise<boolean> {
  const adj = await buildAdjacency();
  return isReachable(adj, toRecipeId, fromRecipeId);
}

// Same check but for a recipe_produces link: recipe now "produces" an ingredient,
// which could be used by another recipe. We check if any recipe that uses this
// ingredient via canonical_recipe_id would create a cycle back to `recipeId`.
export async function canonicalRecipeProducesIngredient(
  recipeId: string,
  ingredientId: string,
): Promise<boolean> {
  const count = await AppDataSource.getRepository(RecipeProduce).countBy({
    recipe_id: recipeId,
    ingredient_id: ingredientId,
  });
  return count > 0;
}
