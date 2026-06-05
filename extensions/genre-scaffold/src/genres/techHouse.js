import { buildChord, scaleDegreePitch } from "../lib/theory.js";
import { addFill, addStepNotes, DRUMS, makeChordNotes, makeNote } from "../lib/patterns.js";
import { createTrack, pickProgression, progressionDegree, sectionClips, sectionIntensity } from "./common.js";

const progressions = [
  [1, 1, 6, 7],
  [1, 1, 4, 5],
  [1, 7, 1, 5]
];

function createDrums(ctx) {
  return createTrack({
    id: "tech-house-drums",
    name: "Drums - Tight Club Pattern",
    role: "drums",
    stockDevices: ["Drum Rack", "Drum Buss", "Glue Compressor"],
    suggestedPreset: "Swap the empty Drum Rack for a tight 909, 707, or modern electronic kit.",
    description: "A straight, loud club groove: four-on-floor kick, sharp clap, offbeat hats, and phrase fills.",
    clips: sectionClips(ctx, "Drums", (section, rng) => {
      const notes = [];
      const intensity = sectionIntensity(ctx, section);
      const breakSection = section.tags.includes("break");
      addStepNotes(notes, {
        pitch: DRUMS.kick,
        bars: section.bars,
        steps: breakSection ? [0, 8] : [0, 4, 8, 12],
        velocity: 112,
        velocityJitter: 2,
        duration: 0.12,
        rng,
        label: "solid club kick"
      });
      addStepNotes(notes, {
        pitch: DRUMS.clap,
        bars: section.bars,
        steps: [4, 12],
        velocity: breakSection ? 68 : 100,
        velocityJitter: 3,
        duration: 0.1,
        rng,
        label: "tight backbeat clap"
      });
      addStepNotes(notes, {
        pitch: DRUMS.openHat,
        bars: section.bars,
        steps: [2, 6, 10, 14],
        velocity: 78,
        velocityJitter: 5,
        duration: 0.16,
        probability: breakSection ? 0.35 : 1,
        rng,
        label: "offbeat open hat"
      });
      addStepNotes(notes, {
        pitch: DRUMS.closedHat,
        bars: section.bars,
        steps: [1, 3, 5, 7, 9, 11, 13, 15],
        velocity: 45,
        velocityJitter: 10,
        duration: 0.055,
        probability: Math.min(0.84, 0.42 * intensity),
        rng,
        label: "tight 16th top loop"
      });
      addFill(notes, {
        pitch: DRUMS.snare,
        bars: section.bars,
        steps: [13, 14, 15],
        velocity: 72,
        rng,
        probability: intensity > 1 ? 0.8 : 0.42,
        label: "snare pickup"
      });
      return notes;
    })
  });
}

function createPerc(ctx) {
  return createTrack({
    id: "tech-house-perc",
    name: "Perc - Minimal Top Loop",
    role: "perc",
    stockDevices: ["Drum Rack", "Auto Pan", "Auto Filter"],
    suggestedPreset: "Use short rims, toms, and dry top-loop samples for this Drum Rack.",
    description: "Small syncopated percussion gives the groove its rolling club motion.",
    clips: sectionClips(ctx, "Perc", (section, rng) => {
      const notes = [];
      const intensity = sectionIntensity(ctx, section);
      addStepNotes(notes, {
        pitch: DRUMS.rim,
        bars: section.bars,
        steps: [3, 10, 15],
        velocity: 62,
        velocityJitter: 8,
        duration: 0.07,
        probability: Math.min(0.9, 0.48 * intensity),
        rng,
        label: "syncopated rim"
      });
      addStepNotes(notes, {
        pitch: DRUMS.tomMid,
        bars: section.bars,
        steps: [6, 11],
        velocity: 58,
        velocityJitter: 8,
        duration: 0.1,
        probability: Math.min(0.76, 0.35 * intensity),
        rng,
        label: "low percussion answer"
      });
      return notes;
    })
  });
}

function createBass(ctx) {
  const progression = pickProgression(ctx, progressions);
  return createTrack({
    id: "tech-house-bass",
    name: "Bass - Rolling Operator",
    role: "bass",
    stockDevices: ["Operator", "Saturator", "EQ Eight", "Compressor"],
    description: "A short, repeating mono bass phrase locks into the kick and gives the loop its identity.",
    clips: sectionClips(ctx, "Bass", (section, rng) => {
      const notes = [];
      const breakSection = section.tags.includes("break");
      const starts = breakSection ? [0.5, 2.5] : [0.5, 1.25, 1.75, 2.5, 3.5];
      for (let bar = 0; bar < section.bars; bar += 1) {
        const degree = progressionDegree(progression, section.startBar + bar);
        const root = scaleDegreePitch(ctx.key, degree, 2);
        const neighbor = scaleDegreePitch(ctx.key, degree + (rng.chance(0.5) ? 1 : 7), 2);
        for (const [index, start] of starts.entries()) {
          const pitch = index === 2 && rng.chance(0.5) ? neighbor : root;
          notes.push(makeNote(pitch, bar * 4 + start, 0.23, 88 + (index === 0 ? 8 : 0), "rolling mono bass"));
        }
      }
      return notes;
    })
  });
}

function createChords(ctx) {
  const progression = pickProgression(ctx, progressions);
  return createTrack({
    id: "tech-house-stabs",
    name: "Stabs - Wavetable Chord Shots",
    role: "chords",
    stockDevices: ["Wavetable", "Auto Filter", "Echo", "Reverb"],
    description: "Sparse chord shots add harmonic color while keeping the low end and drums dominant.",
    clips: sectionClips(ctx, "Stabs", (section, rng) => {
      const notes = [];
      if (section.energy < 0.55) {
        return notes;
      }
      for (let bar = 0; bar < section.bars; bar += 1) {
        if (bar % 2 === 1 && rng.chance(0.45)) {
          continue;
        }
        const degree = progressionDegree(progression, section.startBar + bar);
        const chord = buildChord(ctx.key, degree, { octave: 3, size: 3, inversion: rng.int(0, 1), spread: true });
        for (const start of [1.5, 3.5]) {
          notes.push(...makeChordNotes(chord, bar * 4 + start, 0.18, 62, "filtered tech-house stab"));
        }
      }
      return notes;
    })
  });
}

function createHook(ctx) {
  return createTrack({
    id: "tech-house-hook",
    name: "Hook - One-Shot Synth Motif",
    role: "hook",
    stockDevices: ["Drift", "Auto Filter", "Delay"],
    description: "A tiny repeated motif creates the earworm while leaving room for vocal chops or samples later.",
    clips: sectionClips(ctx, "Hook", (section, rng) => {
      if (!section.tags.includes("peak")) {
        return [];
      }
      const notes = [];
      const degrees = rng.pick([
        [8, 7, 5, 7],
        [5, 5, 6, 5],
        [3, 5, 7, 8]
      ]);
      for (let bar = 0; bar < section.bars; bar += 1) {
        for (let i = 0; i < degrees.length; i += 1) {
          notes.push(makeNote(scaleDegreePitch(ctx.key, degrees[i], 4), bar * 4 + [0, 0.75, 2.5, 3.25][i], 0.18, 70, "short synth hook"));
        }
      }
      return notes;
    })
  });
}

export const techHouse = {
  id: "tech-house",
  label: "Tech House",
  tempo: { min: 124, max: 128, default: 126 },
  defaultKey: "A minor",
  defaultScale: "minor",
  swing: 0.51,
  sections: [
    { name: "DJ intro", weight: 2, minBars: 1, energy: 0.55, tags: ["intro"] },
    { name: "Bass enters", weight: 3, minBars: 2, energy: 0.82, tags: ["groove"] },
    { name: "Perc break", weight: 2, minBars: 1, energy: 0.42, tags: ["break"] },
    { name: "Full drop", weight: 4, minBars: 2, energy: 1, tags: ["peak"] },
    { name: "DJ outro", weight: 2, minBars: 1, energy: 0.68, tags: ["outro"] }
  ],
  createTracks(ctx) {
    return [createDrums(ctx), createPerc(ctx), createBass(ctx), createChords(ctx), createHook(ctx)];
  }
};
