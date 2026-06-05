const NOTE_TO_SEMITONE = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11
};

const SEMITONE_TO_NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  "whole tone": [0, 2, 4, 6, 8, 10],
  "half-whole dim": [0, 1, 3, 4, 6, 7, 9, 10],
  "whole-half dim": [0, 2, 3, 5, 6, 8, 9, 11],
  "minor blues": [0, 3, 5, 6, 7, 10],
  "minor pentatonic": [0, 3, 5, 7, 10],
  "major pentatonic": [0, 2, 4, 7, 9],
  "harmonic minor": [0, 2, 3, 5, 7, 8, 11],
  "harmonic major": [0, 2, 4, 5, 7, 8, 11],
  "dorian #4": [0, 2, 3, 6, 7, 9, 10],
  "phrygian dominant": [0, 1, 4, 5, 7, 8, 10],
  "melodic minor": [0, 2, 3, 5, 7, 9, 11],
  "lydian augmented": [0, 2, 4, 6, 8, 9, 11],
  "lydian dominant": [0, 2, 4, 6, 7, 9, 10],
  "super locrian": [0, 1, 3, 4, 6, 8, 10],
  "8-tone spanish": [0, 1, 3, 4, 5, 6, 8, 10],
  bhairav: [0, 1, 4, 5, 7, 8, 11],
  "hungarian minor": [0, 2, 3, 6, 7, 8, 11],
  hirajoshi: [0, 2, 3, 7, 8],
  "in-sen": [0, 1, 5, 7, 10],
  iwato: [0, 1, 5, 6, 10],
  kumoi: [0, 2, 3, 7, 9],
  "pelog selisir": [0, 1, 3, 7, 8],
  "pelog tembung": [0, 1, 5, 7, 8],
  "messiaen 3": [0, 2, 3, 4, 6, 7, 8, 10, 11],
  "messiaen 4": [0, 1, 2, 5, 6, 7, 8, 11],
  "messiaen 5": [0, 1, 5, 6, 7, 11],
  "messiaen 6": [0, 2, 4, 5, 6, 8, 10, 11],
  "messiaen 7": [0, 1, 2, 3, 5, 6, 7, 8, 9, 11]
};

const SCALE_ALIASES = {
  ionian: "major",
  maj: "major",
  m: "minor",
  min: "minor",
  aeolian: "minor",
  "natural minor": "minor",
  "half-whole dim.": "half-whole dim",
  "half whole dim": "half-whole dim",
  "half whole dim.": "half-whole dim",
  "whole-half dim.": "whole-half dim",
  "whole half dim": "whole-half dim",
  "whole half dim.": "whole-half dim",
  "whole-tone": "whole tone",
  "blues": "minor blues",
  pentatonic: "minor pentatonic",
  "minor-pentatonic": "minor pentatonic",
  "major-pentatonic": "major pentatonic",
  "dorian sharp 4": "dorian #4",
  "dorian #4": "dorian #4",
  "phrygian-dom": "phrygian dominant",
  "phrygian-dominant": "phrygian dominant",
  "mel minor": "melodic minor",
  "lydian-augmented": "lydian augmented",
  "lydian-dominant": "lydian dominant",
  altered: "super locrian",
  "super-locrian": "super locrian",
  "eight tone spanish": "8-tone spanish",
  "8 tone spanish": "8-tone spanish",
  "in sen": "in-sen",
  insen: "in-sen",
  "pelog-selisir": "pelog selisir",
  "pelog-tembung": "pelog tembung",
  "messiaen mode 3": "messiaen 3",
  "messiaen mode 4": "messiaen 4",
  "messiaen mode 5": "messiaen 5",
  "messiaen mode 6": "messiaen 6",
  "messiaen mode 7": "messiaen 7"
};

export function normalizeScaleName(scaleName = "minor") {
  const normalized = String(scaleName).trim().toLowerCase();
  const canonical = SCALE_ALIASES[normalized] ?? normalized;
  if (!SCALES[canonical]) {
    throw new Error(`Unsupported scale "${scaleName}".`);
  }
  return canonical;
}

export function normalizeRoot(root) {
  const compact = String(root).trim();
  const match = compact.match(/^([A-Ga-g])([#b]?)$/);
  if (!match) {
    throw new Error(`Unsupported key root "${root}".`);
  }
  const label = `${match[1].toUpperCase()}${match[2]}`;
  if (!(label in NOTE_TO_SEMITONE)) {
    throw new Error(`Unsupported key root "${root}".`);
  }
  return label;
}

export function parseKey(input = "C minor", fallbackScale = "minor") {
  const raw = String(input || "").trim();
  const compact = raw.match(/^([A-Ga-g])([#b]?)(m|maj|min)?$/);

  if (compact) {
    const root = normalizeRoot(`${compact[1]}${compact[2]}`);
    const suffixScale = compact[3] === "m" || compact[3] === "min" ? "minor" : compact[3] === "maj" ? "major" : fallbackScale;
    const scaleName = normalizeScaleName(suffixScale);
    return createKey(root, scaleName);
  }

  const [rootToken, ...scaleTokens] = raw.split(/\s+/);
  const root = normalizeRoot(rootToken || "C");
  const scaleName = normalizeScaleName(scaleTokens.join(" ") || fallbackScale);
  return createKey(root, scaleName);
}

export function createKey(root, scaleName = "minor") {
  const normalizedRoot = normalizeRoot(root);
  const normalizedScale = normalizeScaleName(scaleName);
  return {
    root: normalizedRoot,
    rootSemitone: NOTE_TO_SEMITONE[normalizedRoot],
    scaleName: normalizedScale,
    intervals: SCALES[normalizedScale],
    label: `${normalizedRoot} ${normalizedScale}`
  };
}

export function midiNote(root, octave) {
  return (octave + 1) * 12 + NOTE_TO_SEMITONE[normalizeRoot(root)];
}

export function scaleDegreePitch(key, degree, octave = 4) {
  const intervals = key.intervals;
  const zeroBased = degree - 1;
  const octaveOffset = Math.floor(zeroBased / intervals.length);
  const index = ((zeroBased % intervals.length) + intervals.length) % intervals.length;
  return midiNote(key.root, octave + octaveOffset) + intervals[index];
}

export function buildChord(key, degree, options = {}) {
  const { octave = 4, size = 3, inversion = 0, spread = false } = options;
  const chordDegrees = [degree, degree + 2, degree + 4, degree + 6].slice(0, size);
  const pitches = chordDegrees.map((chordDegree) => scaleDegreePitch(key, chordDegree, octave));

  for (let i = 0; i < inversion; i += 1) {
    pitches[i % pitches.length] += 12;
  }

  if (spread && pitches.length >= 3) {
    pitches[2] += 12;
  }

  return pitches.sort((a, b) => a - b);
}

export function noteName(pitch) {
  const note = SEMITONE_TO_NOTE[((pitch % 12) + 12) % 12];
  const octave = Math.floor(pitch / 12) - 1;
  return `${note}${octave}`;
}

export function isPitchInScale(key, pitch) {
  const semitone = ((pitch - key.rootSemitone) % 12 + 12) % 12;
  return key.intervals.includes(semitone);
}
