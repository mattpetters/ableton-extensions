import { buildChord, scaleDegreePitch } from "../lib/theory.js";
import { addFill, addStepNotes, DRUMS, makeChordNotes, makeNote } from "../lib/patterns.js";
import { createTrack, pickProgression, progressionDegree, sectionClips, sectionIntensity } from "./common.js";

const progressions = [
  [1, 6, 4, 5],
  [1, 7, 6, 5],
  [1, 5, 6, 4]
];

function createDrums(ctx) {
  return createTrack({
    id: "old-skool-house-drums",
    name: "Drums - 909 House Pattern",
    role: "drums",
    stockDevices: ["Drum Rack", "Drum Buss", "EQ Eight"],
    suggestedPreset: "Loads 909-style Core Library samples when available; swap pads for your favorite house kit.",
    description: "Four-on-the-floor kick, claps on 2 and 4, and offbeat hats for the classic boots-and-cats engine.",
    clips: sectionClips(ctx, "Drums", (section, rng) => {
      const notes = [];
      const intensity = sectionIntensity(ctx, section);
      const breakSection = section.tags.includes("break");
      addStepNotes(notes, {
        pitch: DRUMS.kick,
        bars: section.bars,
        steps: breakSection ? [0, 8] : [0, 4, 8, 12],
        velocity: 104,
        velocityJitter: 3,
        duration: 0.14,
        rng,
        label: "four-on-floor kick"
      });
      addStepNotes(notes, {
        pitch: DRUMS.clap,
        bars: section.bars,
        steps: [4, 12],
        velocity: breakSection ? 74 : 94,
        velocityJitter: 4,
        duration: 0.12,
        rng,
        label: "backbeat clap"
      });
      addStepNotes(notes, {
        pitch: DRUMS.openHat,
        bars: section.bars,
        steps: [2, 6, 10, 14],
        velocity: 78,
        velocityJitter: 6,
        duration: 0.18,
        swing: ctx.recipe.swing,
        probability: breakSection ? 0.45 : 1,
        rng,
        label: "offbeat open hat"
      });
      if (intensity > 0.75) {
        addStepNotes(notes, {
          pitch: DRUMS.closedHat,
          bars: section.bars,
          steps: [0, 4, 8, 12, 15],
          velocity: 55,
          velocityJitter: 8,
          duration: 0.08,
          swing: ctx.recipe.swing,
          probability: 0.72,
          rng,
          label: "busy closed hat"
        });
      }
      addFill(notes, {
        pitch: DRUMS.snare,
        bars: section.bars,
        steps: [12, 13, 14, 15],
        velocity: 67,
        swing: ctx.recipe.swing,
        rng,
        probability: intensity > 0.9 ? 0.8 : 0.45,
        label: "end-of-phrase snare lift"
      });
      return notes;
    })
  });
}

function createPerc(ctx) {
  return createTrack({
    id: "old-skool-house-perc",
    name: "Perc - Conga Push",
    role: "perc",
    stockDevices: ["Drum Rack", "Auto Filter"],
    suggestedPreset: "Loads conga, shaker, or classic house percussion samples when available; replace pads to personalize the groove.",
    description: "Light conga and shaker movement gives the loop a human old-school house push.",
    clips: sectionClips(ctx, "Perc", (section, rng) => {
      const notes = [];
      const intensity = sectionIntensity(ctx, section);
      addStepNotes(notes, {
        pitch: DRUMS.congaLow,
        bars: section.bars,
        steps: [3, 7, 11, 15],
        velocity: 60,
        velocityJitter: 9,
        duration: 0.09,
        swing: ctx.recipe.swing,
        probability: 0.45 * intensity,
        rng,
        label: "conga skip"
      });
      addStepNotes(notes, {
        pitch: DRUMS.shaker,
        bars: section.bars,
        steps: [1, 5, 9, 13],
        velocity: 46,
        velocityJitter: 7,
        duration: 0.06,
        swing: ctx.recipe.swing,
        probability: Math.min(0.9, 0.55 * intensity),
        rng,
        label: "swung shaker"
      });
      return notes;
    })
  });
}

function createBass(ctx) {
  const progression = pickProgression(ctx, progressions);
  return createTrack({
    id: "old-skool-house-bass",
    name: "Bass - Operator Offbeat",
    role: "bass",
    stockDevices: ["Operator", "Saturator", "EQ Eight"],
    description: "Offbeat root bass leaves room for the kick and outlines the chord loop.",
    clips: sectionClips(ctx, "Bass", (section, rng) => {
      const notes = [];
      const breakSection = section.tags.includes("break");
      for (let bar = 0; bar < section.bars; bar += 1) {
        const degree = progressionDegree(progression, section.startBar + bar);
        const root = scaleDegreePitch(ctx.key, degree, 2);
        const fifth = scaleDegreePitch(ctx.key, degree + 4, 2);
        const starts = breakSection ? [0, 2.5] : [0.5, 1.5, 2.5, 3.5];
        for (const [index, start] of starts.entries()) {
          const pitch = index === starts.length - 1 && rng.chance(0.25) ? fifth : root + (rng.chance(0.12) ? 12 : 0);
          notes.push(makeNote(pitch, bar * 4 + start, breakSection ? 0.72 : 0.34, 82 + index * 3, "offbeat chord-root bass"));
        }
      }
      return notes;
    })
  });
}

function createChords(ctx) {
  const progression = pickProgression(ctx, progressions);
  return createTrack({
    id: "old-skool-house-chords",
    name: "Chords - Electric Piano Stabs",
    role: "chords",
    stockDevices: ["Electric", "Auto Filter", "Reverb"],
    suggestedPreset: "Electric piano or house piano stock preset; keep reverb short and low.",
    description: "Short electric-piano-style chord stabs reinforce the groove without writing a full song for the user.",
    clips: sectionClips(ctx, "Chords", (section, rng) => {
      const notes = [];
      const breakSection = section.tags.includes("break");
      for (let bar = 0; bar < section.bars; bar += 1) {
        const degree = progressionDegree(progression, section.startBar + bar);
        const chord = buildChord(ctx.key, degree, { octave: 3, size: 4, inversion: rng.int(0, 1), spread: true });
        const starts = breakSection ? [0] : [0, 1.5, 2.5];
        const duration = breakSection ? 2.8 : 0.28;
        for (const start of starts) {
          notes.push(...makeChordNotes(chord, bar * 4 + start, duration, breakSection ? 58 : 72, "house piano stab"));
        }
      }
      return notes;
    })
  });
}

function createHook(ctx) {
  const motif = [5, 6, 5, 3, 1, 3, 5, 8];
  return createTrack({
    id: "old-skool-house-hook",
    name: "Hook - Drift Organ Riff",
    role: "hook",
    stockDevices: ["Drift", "Echo", "Auto Filter"],
    description: "A small organ-like riff gives the scaffold a memorable call without stealing all the space.",
    clips: sectionClips(ctx, "Hook", (section, rng) => {
      if (section.energy < 0.65) {
        return [];
      }
      const notes = [];
      for (let bar = 0; bar < section.bars; bar += 1) {
        const shifted = rng.chance(0.25) ? 1 : 0;
        for (let i = 0; i < motif.length; i += 1) {
          const degree = motif[(i + shifted) % motif.length];
          const pitch = scaleDegreePitch(ctx.key, degree, 4);
          notes.push(makeNote(pitch, bar * 4 + i * 0.5, 0.22, 66 + (i % 2) * 8, "short organ riff"));
        }
      }
      return notes;
    })
  });
}

export const oldSkoolHouse = {
  id: "old-skool-house",
  label: "Old Skool House",
  tempo: { min: 120, max: 124, default: 122 },
  defaultKey: "C minor",
  defaultScale: "minor",
  swing: 0.55,
  sections: [
    { name: "Intro groove", weight: 2, minBars: 1, energy: 0.55, tags: ["intro"] },
    { name: "Piano groove", weight: 3, minBars: 2, energy: 0.82, tags: ["groove"] },
    { name: "Filter break", weight: 2, minBars: 1, energy: 0.38, tags: ["break"] },
    { name: "Full groove", weight: 3, minBars: 2, energy: 1, tags: ["groove", "peak"] },
    { name: "Outro loop", weight: 2, minBars: 1, energy: 0.68, tags: ["outro"] }
  ],
  createTracks(ctx) {
    return [createDrums(ctx), createPerc(ctx), createBass(ctx), createChords(ctx), createHook(ctx)];
  }
};
