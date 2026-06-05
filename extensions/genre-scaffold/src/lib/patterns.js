export const DRUMS = {
  kick: 36,
  kickAlt: 35,
  snare: 38,
  clap: 39,
  rim: 37,
  closedHat: 42,
  openHat: 46,
  shaker: 70,
  tambourine: 54,
  congaLow: 64,
  congaHigh: 63,
  tomLow: 45,
  tomMid: 47,
  perc: 75,
  snap: 40
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function roundBeat(value) {
  return Math.round(value * 1000) / 1000;
}

export function makeNote(pitch, start, duration, velocity = 82, label) {
  return {
    pitch: clamp(Math.round(pitch), 0, 127),
    start: roundBeat(start),
    duration: roundBeat(Math.max(0.03, duration)),
    velocity: clamp(Math.round(velocity), 1, 127),
    ...(label ? { label } : {})
  };
}

export function makeChordNotes(pitches, start, duration, velocity = 76, label) {
  return pitches.map((pitch) => makeNote(pitch, start, duration, velocity, label));
}

export function stepToBeat(step, grid = 16, swing = 0.5) {
  const beat = (step * 4) / grid;
  if (grid === 16 && step % 2 === 1) {
    return beat + (swing - 0.5) * 0.5;
  }
  return beat;
}

export function addStepNotes(notes, options) {
  const {
    pitch,
    bars,
    steps,
    grid = 16,
    velocity = 82,
    velocityJitter = 0,
    duration = 0.12,
    swing = 0.5,
    probability = 1,
    rng,
    label,
    accents = []
  } = options;

  for (let bar = 0; bar < bars; bar += 1) {
    for (const step of steps) {
      if (rng && probability < 1 && !rng.chance(probability)) {
        continue;
      }
      const jitter = rng && velocityJitter ? rng.int(-velocityJitter, velocityJitter) : 0;
      const accent = accents.includes(step) ? 10 : 0;
      notes.push(makeNote(pitch, bar * 4 + stepToBeat(step, grid, swing), duration, velocity + jitter + accent, label));
    }
  }
}

export function addFill(notes, options) {
  const {
    pitch,
    bars,
    everyBars = 4,
    grid = 16,
    steps = [12, 13, 14, 15],
    velocity = 76,
    duration = 0.1,
    swing = 0.5,
    rng,
    probability = 0.7,
    label
  } = options;

  for (let bar = everyBars - 1; bar < bars; bar += everyBars) {
    if (rng && !rng.chance(probability)) {
      continue;
    }
    for (const step of steps) {
      notes.push(makeNote(pitch, bar * 4 + stepToBeat(step, grid, swing), duration, velocity, label));
    }
  }
}

export function makeClip(section, name, notes, description) {
  const sortedNotes = notes
    .filter((note) => note.start < section.bars * 4)
    .sort((a, b) => a.start - b.start || a.pitch - b.pitch);

  return {
    name,
    startBar: section.startBar,
    bars: section.bars,
    notes: sortedNotes,
    ...(description ? { description } : {})
  };
}

export function rotate(values, amount) {
  const offset = ((amount % values.length) + values.length) % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}
