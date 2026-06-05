import { buildChord, scaleDegreePitch } from "../lib/theory.js";
import { addFill, addStepNotes, DRUMS, makeChordNotes, makeNote } from "../lib/patterns.js";
import { createTrack, pickProgression, progressionDegree, sectionClips, sectionIntensity } from "./common.js";

const progressions = [
  [1, 6, 4, 5],
  [1, 4, 1, 5],
  [1, 7, 6, 5]
];

function createDrums(ctx) {
  return createTrack({
    id: "90s-hip-hop-drums",
    name: "Drums - Boom Bap Pattern",
    role: "drums",
    stockDevices: ["Drum Rack", "Drum Buss", "Saturator"],
    suggestedPreset: "Swap the empty Drum Rack for an acoustic/electronic boom-bap kit.",
    description: "Swung hats, heavy snare on 2 and 4, and syncopated kicks for a boom-bap pocket.",
    clips: sectionClips(ctx, "Drums", (section, rng) => {
      const notes = [];
      const intensity = sectionIntensity(ctx, section);
      const kickSteps = rng.pick([
        [0, 3, 7, 10],
        [0, 6, 10, 14],
        [0, 5, 8, 11]
      ]);
      addStepNotes(notes, {
        pitch: DRUMS.kick,
        bars: section.bars,
        steps: section.tags.includes("break") ? [0, 10] : kickSteps,
        velocity: 104,
        velocityJitter: 7,
        duration: 0.13,
        swing: ctx.recipe.swing,
        rng,
        label: "boom-bap kick"
      });
      addStepNotes(notes, {
        pitch: DRUMS.snare,
        bars: section.bars,
        steps: [4, 12],
        velocity: 108,
        velocityJitter: 4,
        duration: 0.12,
        swing: ctx.recipe.swing,
        rng,
        label: "heavy snare backbeat"
      });
      addStepNotes(notes, {
        pitch: DRUMS.closedHat,
        bars: section.bars,
        steps: [0, 2, 4, 6, 8, 10, 12, 14],
        velocity: 50,
        velocityJitter: 14,
        duration: 0.055,
        swing: ctx.recipe.swing,
        probability: Math.min(0.95, 0.72 * intensity),
        rng,
        label: "swung hat pocket"
      });
      addStepNotes(notes, {
        pitch: DRUMS.rim,
        bars: section.bars,
        steps: [6, 14],
        velocity: 42,
        velocityJitter: 8,
        duration: 0.06,
        swing: ctx.recipe.swing,
        probability: Math.min(0.7, 0.36 * intensity),
        rng,
        label: "ghost snare"
      });
      addFill(notes, {
        pitch: DRUMS.snare,
        bars: section.bars,
        steps: [10, 12, 14],
        velocity: 64,
        swing: ctx.recipe.swing,
        rng,
        probability: 0.35,
        label: "laid-back snare fill"
      });
      return notes;
    })
  });
}

function createPerc(ctx) {
  return createTrack({
    id: "90s-hip-hop-perc",
    name: "Perc - Vinyl Top Texture",
    role: "perc",
    stockDevices: ["Drum Rack", "Vinyl Distortion", "Auto Filter"],
    suggestedPreset: "Use dusty shaker, rim, and vinyl-noise samples for this Drum Rack.",
    description: "Subtle shaker and rim details create a sampled-loop feel while staying stock-only.",
    clips: sectionClips(ctx, "Perc", (section, rng) => {
      const notes = [];
      const intensity = sectionIntensity(ctx, section);
      addStepNotes(notes, {
        pitch: DRUMS.shaker,
        bars: section.bars,
        steps: [1, 5, 9, 13],
        velocity: 40,
        velocityJitter: 10,
        duration: 0.05,
        swing: ctx.recipe.swing,
        probability: Math.min(0.8, 0.5 * intensity),
        rng,
        label: "dusty shaker"
      });
      addStepNotes(notes, {
        pitch: DRUMS.rim,
        bars: section.bars,
        steps: [3, 11, 15],
        velocity: 44,
        velocityJitter: 9,
        duration: 0.055,
        swing: ctx.recipe.swing,
        probability: Math.min(0.65, 0.32 * intensity),
        rng,
        label: "rim detail"
      });
      return notes;
    })
  });
}

function createBass(ctx) {
  const progression = pickProgression(ctx, progressions);
  return createTrack({
    id: "90s-hip-hop-bass",
    name: "Bass - Warm Sampled Sub",
    role: "bass",
    stockDevices: ["Operator", "Saturator", "EQ Eight"],
    description: "A simple root-and-fifth bassline supports the drums and chord sample.",
    clips: sectionClips(ctx, "Bass", (section, rng) => {
      const notes = [];
      for (let bar = 0; bar < section.bars; bar += 1) {
        const degree = progressionDegree(progression, section.startBar + bar);
        const root = scaleDegreePitch(ctx.key, degree, 2);
        const fifth = scaleDegreePitch(ctx.key, degree + 4, 2);
        const pattern = section.tags.includes("break")
          ? [[0, root, 1.2], [2.5, fifth, 0.5]]
          : [[0, root, 0.55], [1.45, fifth, 0.38], [2.35, root, 0.42], [3.1, rng.chance(0.35) ? root + 12 : fifth, 0.32]];
        for (const [start, pitch, duration] of pattern) {
          notes.push(makeNote(pitch, bar * 4 + start, duration, 84, "root-and-fifth boom-bap bass"));
        }
      }
      return notes;
    })
  });
}

function createChords(ctx) {
  const progression = pickProgression(ctx, progressions);
  return createTrack({
    id: "90s-hip-hop-chops",
    name: "Chords - Dusty Key Chops",
    role: "chords",
    stockDevices: ["Electric", "Vinyl Distortion", "Auto Filter", "Reverb"],
    description: "Short chord chops imply a sample without requiring any third-party audio.",
    clips: sectionClips(ctx, "Chops", (section, rng) => {
      const notes = [];
      for (let bar = 0; bar < section.bars; bar += 1) {
        const degree = progressionDegree(progression, section.startBar + bar);
        const chord = buildChord(ctx.key, degree, { octave: 3, size: 4, inversion: rng.int(0, 2), spread: false });
        const starts = section.tags.includes("break") ? [0] : [0, 1.75, 2.75];
        for (const start of starts) {
          notes.push(...makeChordNotes(chord, bar * 4 + start, section.tags.includes("break") ? 1.4 : 0.28, 62, "dusty key chop"));
        }
      }
      return notes;
    })
  });
}

function createHook(ctx) {
  return createTrack({
    id: "90s-hip-hop-hook",
    name: "Hook - Vibey Lead",
    role: "hook",
    stockDevices: ["Electric", "Echo", "Reverb"],
    description: "A restrained melodic answer gives identity but keeps space for rap vocals.",
    clips: sectionClips(ctx, "Hook", (section, rng) => {
      if (section.tags.includes("intro")) {
        return [];
      }
      const notes = [];
      const motif = rng.pick([
        [5, 3, 1, 3],
        [8, 7, 5, 3],
        [3, 5, 6, 5]
      ]);
      const starts = [0.5, 1.5, 2.25, 3.25];
      for (let bar = 0; bar < section.bars; bar += 1) {
        if (bar % 2 === 1 && rng.chance(0.4)) {
          continue;
        }
        for (let i = 0; i < motif.length; i += 1) {
          notes.push(makeNote(scaleDegreePitch(ctx.key, motif[i], 4), bar * 4 + starts[i], 0.24, 58 + i * 3, "laid-back melodic answer"));
        }
      }
      return notes;
    })
  });
}

export const ninetiesHipHop = {
  id: "90s-hip-hop",
  label: "90s Hip Hop",
  tempo: { min: 84, max: 94, default: 88 },
  defaultKey: "D minor",
  defaultScale: "minor",
  swing: 0.58,
  sections: [
    { name: "Crate intro", weight: 2, minBars: 1, energy: 0.48, tags: ["intro"] },
    { name: "Verse pocket", weight: 4, minBars: 2, energy: 0.82, tags: ["groove"] },
    { name: "Hook lift", weight: 3, minBars: 2, energy: 0.95, tags: ["peak"] },
    { name: "Drum break", weight: 2, minBars: 1, energy: 0.42, tags: ["break"] },
    { name: "Outro pocket", weight: 2, minBars: 1, energy: 0.65, tags: ["outro"] }
  ],
  createTracks(ctx) {
    return [createDrums(ctx), createPerc(ctx), createBass(ctx), createChords(ctx), createHook(ctx)];
  }
};
