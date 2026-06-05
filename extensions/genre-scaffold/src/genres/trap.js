import { buildChord, scaleDegreePitch } from "../lib/theory.js";
import { addStepNotes, DRUMS, makeChordNotes, makeNote } from "../lib/patterns.js";
import { createTrack, pickProgression, progressionDegree, sectionClips, sectionIntensity } from "./common.js";

const progressions = [
  [1, 6, 3, 7],
  [1, 4, 6, 5],
  [1, 7, 6, 7]
];

function addHatRolls(notes, section, rng) {
  for (let bar = 3; bar < section.bars; bar += 4) {
    if (!rng.chance(0.8)) {
      continue;
    }
    const rollStart = rng.pick([2.5, 3, 3.25]);
    const repeats = rng.pick([4, 6, 8]);
    for (let i = 0; i < repeats; i += 1) {
      notes.push(makeNote(DRUMS.closedHat, bar * 4 + rollStart + i * 0.125, 0.045, 48 + i * 4, "1/32 trap hat roll"));
    }
  }
}

function createDrums(ctx) {
  return createTrack({
    id: "trap-drums",
    name: "Drums - 808 Trap Kit",
    role: "drums",
    stockDevices: ["Drum Rack", "Core Library 808-style kit", "Drum Buss", "Saturator"],
    description: "Half-time snare, sparse kicks, and hat rolls give the scaffold its trap grid.",
    clips: sectionClips(ctx, "Drums", (section, rng) => {
      const notes = [];
      const intensity = sectionIntensity(ctx, section);
      const kickSteps = rng.pick([
        [0, 6, 10, 14],
        [0, 7, 11],
        [0, 3, 10, 13]
      ]);
      addStepNotes(notes, {
        pitch: DRUMS.kick,
        bars: section.bars,
        steps: section.tags.includes("break") ? [0, 10] : kickSteps,
        velocity: 106,
        velocityJitter: 5,
        duration: 0.12,
        probability: section.tags.includes("intro") ? 0.55 : 1,
        rng,
        label: "808 kick pattern"
      });
      addStepNotes(notes, {
        pitch: DRUMS.snare,
        bars: section.bars,
        steps: [8],
        velocity: 104,
        velocityJitter: 3,
        duration: 0.11,
        rng,
        label: "half-time snare"
      });
      addStepNotes(notes, {
        pitch: DRUMS.closedHat,
        bars: section.bars,
        steps: [0, 2, 4, 6, 8, 10, 12, 14],
        velocity: 52,
        velocityJitter: 11,
        duration: 0.055,
        probability: Math.min(0.98, 0.62 * intensity),
        rng,
        label: "steady trap hats"
      });
      if (!section.tags.includes("intro")) {
        addHatRolls(notes, section, rng);
      }
      addStepNotes(notes, {
        pitch: DRUMS.snap,
        bars: section.bars,
        steps: [15],
        velocity: 44,
        velocityJitter: 7,
        duration: 0.05,
        probability: Math.min(0.65, 0.35 * intensity),
        rng,
        label: "snap pickup"
      });
      return notes;
    })
  });
}

function createPerc(ctx) {
  return createTrack({
    id: "trap-perc",
    name: "Perc - Sparse Ear Candy",
    role: "perc",
    stockDevices: ["Drum Rack", "Echo", "Hybrid Reverb"],
    description: "Sparse snaps and percussion leave negative space around the 808 and vocal lane.",
    clips: sectionClips(ctx, "Perc", (section, rng) => {
      const notes = [];
      const intensity = sectionIntensity(ctx, section);
      addStepNotes(notes, {
        pitch: DRUMS.rim,
        bars: section.bars,
        steps: [3, 12, 15],
        velocity: 48,
        velocityJitter: 10,
        duration: 0.05,
        probability: Math.min(0.72, 0.32 * intensity),
        rng,
        label: "rim ear candy"
      });
      addStepNotes(notes, {
        pitch: DRUMS.openHat,
        bars: section.bars,
        steps: [6, 14],
        velocity: 58,
        velocityJitter: 8,
        duration: 0.12,
        probability: Math.min(0.55, 0.25 * intensity),
        rng,
        label: "open-hat lift"
      });
      return notes;
    })
  });
}

function createBass(ctx) {
  const progression = pickProgression(ctx, progressions);
  return createTrack({
    id: "trap-808",
    name: "Bass - Operator 808",
    role: "bass",
    stockDevices: ["Operator", "Saturator", "EQ Eight", "Compressor"],
    description: "Long low 808 notes follow the minor progression and answer the sparse kick pattern.",
    clips: sectionClips(ctx, "808", (section, rng) => {
      const notes = [];
      for (let bar = 0; bar < section.bars; bar += 1) {
        const degree = progressionDegree(progression, section.startBar + bar);
        const root = scaleDegreePitch(ctx.key, degree, 1);
        const fifth = scaleDegreePitch(ctx.key, degree + 4, 1);
        const octave = root + 12;
        const pattern = section.tags.includes("break")
          ? [[0, root, 2.2], [3, fifth, 0.75]]
          : [[0, root, 1.35], [1.75, rng.chance(0.4) ? octave : fifth, 0.45], [2.5, root, 1], [3.45, octave, 0.32]];
        for (const [start, pitch, duration] of pattern) {
          notes.push(makeNote(pitch, bar * 4 + start, duration, 94, "808 root movement"));
        }
      }
      return notes;
    })
  });
}

function createChords(ctx) {
  const progression = pickProgression(ctx, progressions);
  return createTrack({
    id: "trap-chords",
    name: "Chords - Dark Wavetable Pad",
    role: "chords",
    stockDevices: ["Wavetable", "Auto Filter", "Hybrid Reverb", "Utility"],
    description: "Slow minor pads set the key and mood without crowding the drums.",
    clips: sectionClips(ctx, "Chords", (section, rng) => {
      const notes = [];
      for (let bar = 0; bar < section.bars; bar += 1) {
        const degree = progressionDegree(progression, section.startBar + bar);
        const chord = buildChord(ctx.key, degree, { octave: 3, size: 3, inversion: rng.int(0, 1), spread: true });
        const duration = section.tags.includes("break") ? 3.6 : 2.8;
        notes.push(...makeChordNotes(chord, bar * 4, duration, 52, "dark sustained minor pad"));
      }
      return notes;
    })
  });
}

function createHook(ctx) {
  return createTrack({
    id: "trap-bell-hook",
    name: "Hook - Bell Pluck",
    role: "hook",
    stockDevices: ["Operator", "Echo", "Reverb"],
    description: "Sparse bell notes use minor-scale space and leave room for a vocal/topline.",
    clips: sectionClips(ctx, "Hook", (section, rng) => {
      if (section.tags.includes("break")) {
        return [];
      }
      const notes = [];
      const motif = rng.pick([
        [8, 7, 5, 3],
        [10, 8, 7, 5],
        [5, 7, 8, 12]
      ]);
      const starts = [0.25, 1.5, 2.25, 3.5];
      for (let bar = 0; bar < section.bars; bar += 1) {
        if (bar % 2 === 1 && rng.chance(0.35)) {
          continue;
        }
        for (let i = 0; i < motif.length; i += 1) {
          notes.push(makeNote(scaleDegreePitch(ctx.key, motif[i], 5), bar * 4 + starts[i], 0.2, 62 + i * 3, "sparse bell motif"));
        }
      }
      return notes;
    })
  });
}

export const trap = {
  id: "trap",
  label: "Trap",
  tempo: { min: 136, max: 148, default: 140 },
  defaultKey: "F# minor",
  defaultScale: "minor",
  swing: 0.5,
  sections: [
    { name: "Sparse intro", weight: 2, minBars: 1, energy: 0.45, tags: ["intro"] },
    { name: "Hook setup", weight: 3, minBars: 2, energy: 0.78, tags: ["groove"] },
    { name: "Drop", weight: 4, minBars: 2, energy: 1, tags: ["peak"] },
    { name: "Breakdown", weight: 2, minBars: 1, energy: 0.38, tags: ["break"] },
    { name: "Final hook", weight: 3, minBars: 2, energy: 0.92, tags: ["peak", "outro"] }
  ],
  createTracks(ctx) {
    return [createDrums(ctx), createPerc(ctx), createBass(ctx), createChords(ctx), createHook(ctx)];
  }
};
