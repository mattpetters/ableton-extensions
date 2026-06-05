import { ninetiesHipHop } from "./ninetiesHipHop.js";
import { oldSkoolHouse } from "./oldSkoolHouse.js";
import { techHouse } from "./techHouse.js";
import { trap } from "./trap.js";
import { ukGarage } from "./ukGarage.js";

export const recipes = [oldSkoolHouse, techHouse, ukGarage, trap, ninetiesHipHop];

const aliases = new Map();
for (const recipe of recipes) {
  aliases.set(recipe.id, recipe);
  aliases.set(recipe.label.toLowerCase().replaceAll(" ", "-"), recipe);
}
aliases.set("old-school-house", oldSkoolHouse);
aliases.set("house", oldSkoolHouse);
aliases.set("ukg", ukGarage);
aliases.set("garage", ukGarage);
aliases.set("hip-hop", ninetiesHipHop);
aliases.set("boom-bap", ninetiesHipHop);
aliases.set("90s-hiphop", ninetiesHipHop);

export function getRecipe(id) {
  const key = String(id).trim().toLowerCase();
  const recipe = aliases.get(key);
  if (!recipe) {
    throw new Error(`Unknown genre "${id}". Available genres: ${listGenres().join(", ")}.`);
  }
  return recipe;
}

export function listGenres() {
  return recipes.map((recipe) => recipe.id);
}
