import { buildArrangement, optionFactor } from "./lib/arrangement.js";
import { createRng } from "./lib/rng.js";
import { createKey, parseKey } from "./lib/theory.js";
import { getRecipe } from "./genres/index.js";

const DENSITY_FACTORS = {
  sparse: 0.75,
  balanced: 1,
  busy: 1.25
};

const ENERGY_FACTORS = {
  low: 0.78,
  medium: 1,
  high: 1.18
};

function resolveTempo(recipe, tempo, rng) {
  if (tempo) {
    return Number(tempo);
  }
  if (recipe.tempo.default) {
    return recipe.tempo.default;
  }
  return rng.int(recipe.tempo.min, recipe.tempo.max);
}

function validateScaffold(scaffold) {
  for (const track of scaffold.tracks) {
    if (!track.clips.length) {
      throw new Error(`Track "${track.name}" has no clips.`);
    }
    for (const clip of track.clips) {
      for (const note of clip.notes) {
        if (note.pitch < 0 || note.pitch > 127) {
          throw new Error(`Invalid pitch ${note.pitch} in "${track.name}".`);
        }
        if (note.velocity < 1 || note.velocity > 127) {
          throw new Error(`Invalid velocity ${note.velocity} in "${track.name}".`);
        }
        if (note.start < 0 || note.start >= clip.bars * 4) {
          throw new Error(`Invalid note start ${note.start} in "${clip.name}".`);
        }
      }
    }
  }
}

export function generateScaffold(options = {}) {
  const recipe = getRecipe(options.genre ?? "old-skool-house");
  const seed = String(options.seed ?? `${recipe.id}:default`);
  const rng = createRng(`${recipe.id}:${seed}`);
  const parsedKey = parseKey(options.key ?? recipe.defaultKey, recipe.defaultScale);
  const key = options.scale ? createKey(parsedKey.root, options.scale) : parsedKey;
  const bars = Math.max(4, Math.floor(Number(options.bars) || 16));
  const tempo = resolveTempo(recipe, options.tempo, rng);
  const density = options.density ?? "balanced";
  const energy = options.energy ?? "medium";
  const arrangement = buildArrangement(recipe.sections, bars);
  const context = {
    recipe,
    seed,
    key,
    bars,
    tempo,
    density,
    energy,
    densityFactor: optionFactor(density, DENSITY_FACTORS, 1),
    energyFactor: optionFactor(energy, ENERGY_FACTORS, 1),
    arrangement,
    rng,
    fork(label) {
      return rng.fork(label);
    }
  };

  const scaffold = {
    meta: {
      id: `${recipe.id}:${seed}`,
      label: `${recipe.label} in ${key.label}`,
      generator: "ableton-genre-scaffold",
      stockOnly: true,
      seed,
      density,
      energy
    },
    genre: {
      id: recipe.id,
      label: recipe.label
    },
    key,
    tempo,
    bars,
    sections: arrangement,
    tracks: recipe.createTracks(context)
  };

  validateScaffold(scaffold);
  return scaffold;
}
