function xmur3(value) {
  let h = 1779033703 ^ value.length;
  for (let i = 0; i < value.length; i += 1) {
    h = Math.imul(h ^ value.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function hash() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed = "genre-scaffold") {
  const seedText = String(seed);
  const random = mulberry32(xmur3(seedText)());

  return {
    seed: seedText,

    float() {
      return random();
    },

    int(min, max) {
      return Math.floor(random() * (max - min + 1)) + min;
    },

    chance(probability) {
      return random() < probability;
    },

    pick(items) {
      if (!items.length) {
        throw new Error("Cannot pick from an empty list.");
      }
      return items[this.int(0, items.length - 1)];
    },

    weighted(items) {
      const total = items.reduce((sum, item) => sum + item.weight, 0);
      let cursor = random() * total;
      for (const item of items) {
        cursor -= item.weight;
        if (cursor <= 0) {
          return item.value;
        }
      }
      return items.at(-1).value;
    },

    shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = this.int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },

    fork(label) {
      return createRng(`${seedText}:${label}`);
    }
  };
}
