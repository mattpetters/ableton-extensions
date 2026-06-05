import { buildChord, scaleDegreePitch } from "../lib/theory.js";
import { addFill, addStepNotes, DRUMS, makeChordNotes, makeNote } from "../lib/patterns.js";
import { createTrack, pickProgression, progressionDegree, sectionClips, sectionIntensity } from "./common.js";

const progressions = [
  [1, 6, 4, 5],
  [1, 7, 6, 4],
  [1, 4, 2, 5]
];

function createDrums(ctx) {
  return createTrack({
    id: "uk-garage-drums",
    name: "Drums - 2-Step Kit",
    role: "drums",
    stockDevices: ["Drum Rack", "Core Library electronic kit", "Drum Buss", "Hybrid Reverb"],
    description: "A swung 2-step pattern with syncopated kicks, snappy backbeats, and shuffled hats.",
    clips: sectionClips(ctx, "Drums", (section, rng) => {
      const notes = [];
      const intensity = sectionIntensity(ctx, section);
      const breakSection = section.tags.includes("break");
      const kickSteps = rng.pick([
        [0, 6, 10],
        [0, 5, 10, 14],
        [0, 7, 11]
      ]);
      addStepNotes(notes, {
        pitch: DRUMS.kick,
        bars: section.bars,
        steps: breakSection ? [0, 10] : kickSteps,
        velocity: 98,
        velocityJitter: 5,
        duration: 0.12,
        swing: ctx.recipe.swing,
        rng,
        label: "syncopated 2-step kick"
      });
      addStepNotes(notes, {
        pitch: DRUMS.snare,
        bars: section.bars,
        steps: [4, 12],
        velocity: breakSection ? 72 : 98,
        velocityJitter: 4,
        duration: 0.1,
        swing: ctx.recipe.swing,
        rng,
        label: "garage backbeat snare"
      });
      addStepNotes(notes, {
        pitch: DRUMS.closedHat,
        bars: section.bars,
        steps: [0, 2, 3, 5, 6, 8, 10, 11, 13, 14],
        velocity: 55,
        velocityJitter: 12,
        duration: 0.055,
        swing: ctx.recipe.swing,
        probability: breakSection ? 0.55 : Math.min(0.96, 0.74 * intensity),
        rng,
        label: "shuffled garage hats"
      });
      addStepNotes(notes, {
        pitch: DRUMS.rim,
        bars: section.bars,
        steps: [3, 11, 15],
        velocity: 48,
        velocityJitter: 8,
        duration: 0.06,
        swing: ctx.recipe.swing,
        probability: Math.min(0.85, 0.48 * intensity),
        rng,
        label: "ghost rim push"
      });
      addFill(notes, {
        pitch: DRUMS.snare,
        bars: section.bars,
        steps: [11, 13, 15],
        velocity: 62,
        swing: ctx.recipe.swing,
        rng,
        probability: intensity > 1 ? 0.75 : 0.4,
        label: "swung snare pickup"
      });
      return notes;
    })
  });
}

function createPerc(ctx) {
  return createTrack({
    id: "uk-garage-perc",
    name: "Perc - Shuffled Tops",
    role: "perc",
    stockDevices: ["Drum Rack", "Auto Pan", "Echo"],
    description: "Extra shuffled tops and small percussive answers reinforce the garage feel.",
    clips: sectionClips(ctx, "Perc", (section, rng) => {
      const notes = [];
      const intensity = sectionIntensity(ctx, section);
      addStepNotes(notes, {
        pitch: DRUMS.shaker,
        bars: section.bars,
        steps: [1, 4, 7, 9, 12, 15],
        velocity: 44,
        velocityJitter: 10,
        duration: 0.045,
        swing: ctx.recipe.swing,
        probability: Math.min(0.9, 0.58 * intensity),
        rng,
        label: "shuffle texture"
      });
      addStepNotes(notes, {
        pitch: DRUMS.snap,
        bars: section.bars,
        steps: [6, 14],
        velocity: 58,
        velocityJitter: 8,
        duration: 0.06,
        swing: ctx.recipe.swing,
        probability: Math.min(0.7, 0.36 * intensity),
        rng,
        label: "snap answer"
      });
      return notes;
    })
  });
}

function createBass(ctx) {
  const progression = pickProgression(ctx, progressions);
  return createTrack({
    id: "uk-garage-bass",
    name: "Bass - Shuffled Sub",
    role: "bass",
    stockDevices: ["Operator", "Saturator", "EQ Eight", "Sidechain Compressor"],
    description: "A swung sub pattern answers the kick rather than simply following it.",
    clips: sectionClips(ctx, "Bass", (section, rng) => {
      const notes = [];
      const breakSection = section.tags.includes("break");
      for (let bar = 0; bar < section.bars; bar += 1) {
        const degree = progressionDegree(progression, section.startBar + bar);
        const root = scaleDegreePitch(ctx.key, degree, 2);
        const octave = root + 12;
        const fifth = scaleDegreePitch(ctx.key, degree + 4, 2);
        const pattern = breakSection ? [[0, root, 0.7], [2.5, fifth, 0.35]] : [
          [0, root, 0.32],
          [0.82, octave, 0.18],
          [1.55, fifth, 0.24],
          [2.5, root, 0.38],
          [3.2, rng.chance(0.45) ? octave : fifth, 0.22]
        ];
        for (const [start, pitch, duration] of pattern) {
          notes.push(makeNote(pitch, bar * 4 + start, duration, 86, "swung sub bass answer"));
        }
      }
      return notes;
    })
  });
}

function createChords(ctx) {
  const progression = pickProgression(ctx, progressions);
  return createTrack({
    id: "uk-garage-chords",
    name: "Chords - Organ Seventh Stabs",
    role: "chords",
    stockDevices: ["Wavetable", "Chord", "Auto Filter", "Echo"],
    description: "Seventh-chord stabs supply the soulful UKG color and leave rhythmic gaps for the drums.",
    clips: sectionClips(ctx, "Chords", (section, rng) => {
      const notes = [];
      for (let bar = 0; bar < section.bars; bar += 1) {
        const degree = progressionDegree(progression, section.startBar + bar);
        const chord = buildChord(ctx.key, degree, { octave: 3, size: 4, inversion: rng.int(0, 2), spread: false });
        const starts = section.tags.includes("break") ? [0, 2.5] : [0, 1.2, 2.5, 3.25];
        for (const start of starts) {
          notes.push(...makeChordNotes(chord, bar * 4 + start, 0.28, 66, "swung seventh-chord stab"));
        }
      }
      return notes;
    })
  });
}

function createHook(ctx) {
  return createTrack({
    id: "uk-garage-hook",
    name: "Hook - Pluck Chops",
    role: "hook",
    stockDevices: ["Drift", "Echo", "Auto Filter"],
    description: "A clipped pluck line suggests vocal-chop phrasing without depending on samples.",
    clips: sectionClips(ctx, "Hook", (section, rng) => {
      if (section.tags.includes("intro")) {
        return [];
      }
      const notes = [];
      const motif = rng.pick([
        [8, 7, 5, 6, 5],
        [5, 3, 5, 7, 8],
        [10, 8, 7, 5, 3]
      ]);
      const starts = [0.15, 0.82, 1.55, 2.65, 3.2];
      for (let bar = 0; bar < section.bars; bar += 1) {
        for (let i = 0; i < motif.length; i += 1) {
          notes.push(makeNote(scaleDegreePitch(ctx.key, motif[i], 4), bar * 4 + starts[i], 0.16, 68 + i * 2, "pluck-chop motif"));
        }
      }
      return notes;
    })
  });
}

export const ukGarage = {
  id: "uk-garage",
  label: "UK Garage",
  tempo: { min: 130, max: 134, default: 132 },
  defaultKey: "F minor",
  defaultScale: "minor",
  swing: 0.62,
  sections: [
    { name: "Atmos intro", weight: 2, minBars: 1, energy: 0.48, tags: ["intro"] },
    { name: "2-step groove", weight: 3, minBars: 2, energy: 0.82, tags: ["groove"] },
    { name: "Vocal-space break", weight: 2, minBars: 1, energy: 0.4, tags: ["break"] },
    { name: "Full shuffle", weight: 4, minBars: 2, energy: 1, tags: ["peak"] },
    { name: "Outro shuffle", weight: 2, minBars: 1, energy: 0.65, tags: ["outro"] }
  ],
  createTracks(ctx) {
    return [createDrums(ctx), createPerc(ctx), createBass(ctx), createChords(ctx), createHook(ctx)];
  }
};
