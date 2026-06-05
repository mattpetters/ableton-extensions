import type {
  ExtensionContext,
  MidiTrack,
  NoteDescription
} from "@ableton-extensions/sdk";
import { generateScaffold } from "../generateScaffold.js";

type ScaffoldOptions = {
  genre: string;
  key: string;
  bars: number;
  density: "sparse" | "balanced" | "busy";
  energy: "low" | "medium" | "high";
  seed: string;
  tempo?: number;
};

type ScaffoldNote = {
  pitch: number;
  start: number;
  duration: number;
  velocity?: number;
};

type ScaffoldClip = {
  name: string;
  startBar: number;
  bars: number;
  notes: ScaffoldNote[];
};

type ScaffoldTrack = {
  name: string;
  role: string;
  stockDevices: string[];
  clips: ScaffoldClip[];
};

type ScaffoldSection = {
  name: string;
  startBar: number;
  bars: number;
};

type Scaffold = ReturnType<typeof generateScaffold> & {
  sections: ScaffoldSection[];
  tracks: ScaffoldTrack[];
};

const CLIP_COLORS: Record<string, number> = {
  drums: 0xff8a00,
  perc: 0xffc400,
  bass: 0x5cc86a,
  chords: 0x5aa7ff,
  hook: 0xd56bff
};

const INSERTABLE_DEVICES = new Set([
  "Auto Filter",
  "Compressor",
  "Delay",
  "Drift",
  "Drum Buss",
  "Drum Rack",
  "Echo",
  "Electric",
  "EQ Eight",
  "Glue Compressor",
  "Hybrid Reverb",
  "Operator",
  "Reverb",
  "Saturator",
  "Utility",
  "Vinyl Distortion",
  "Wavetable"
]);

function toNoteDescription(note: ScaffoldNote): NoteDescription {
  return {
    pitch: note.pitch,
    startTime: note.start,
    duration: note.duration,
    velocity: note.velocity ?? 90
  };
}

function displayTrackName(scaffold: Scaffold, track: ScaffoldTrack) {
  return `${scaffold.genre.label} | ${track.name}`;
}

function preferredDevices(track: ScaffoldTrack) {
  return track.stockDevices
    .filter((name) => INSERTABLE_DEVICES.has(name))
    .slice(0, 3);
}

async function insertStockDevices(liveTrack: MidiTrack<"1.0.0">, track: ScaffoldTrack) {
  const devices = preferredDevices(track);
  for (const [index, deviceName] of devices.entries()) {
    try {
      await liveTrack.insertDevice(deviceName, index);
    } catch (error) {
      console.warn(`Could not insert stock device "${deviceName}" on "${track.name}".`, error);
    }
  }
}

async function createCuePoints(context: ExtensionContext<"1.0.0">, scaffold: Scaffold, baseBeat: number) {
  for (const section of scaffold.sections) {
    try {
      const cuePoint = await context.application.song.createCuePoint(baseBeat + section.startBar * 4);
      cuePoint.name = `${section.name} - ${scaffold.genre.label}`;
    } catch (error) {
      console.warn(`Could not create cue point "${section.name}".`, error);
    }
  }
}

async function createTrackClips(liveTrack: MidiTrack<"1.0.0">, track: ScaffoldTrack, baseBeat: number) {
  for (const clipSpec of track.clips) {
    const startTime = baseBeat + clipSpec.startBar * 4;
    const duration = clipSpec.bars * 4;
    const clip = await liveTrack.createMidiClip(startTime, duration);
    clip.name = clipSpec.name;
    clip.looping = true;
    clip.color = CLIP_COLORS[track.role] ?? 0x888888;
    clip.notes = clipSpec.notes.map(toNoteDescription);
  }
}

export async function renderGenreScaffold(
  context: ExtensionContext<"1.0.0">,
  options: ScaffoldOptions,
  baseBeat = 0
) {
  const scaffold = generateScaffold(options) as Scaffold;
  const song = context.application.song;

  song.tempo = scaffold.tempo;

  await context.ui.withinProgressDialog(
    "Generating Genre Scaffold",
    { progress: 0 },
    async (update, signal) => {
      await update("Creating arrangement markers", 8);
      if (signal.aborted) return;
      await createCuePoints(context, scaffold, baseBeat);

      await update("Creating MIDI tracks", 20);
      if (signal.aborted) return;
      const createdTracks = await context.withinTransaction(() =>
        Promise.all(scaffold.tracks.map(() => song.createMidiTrack()))
      );

      for (let index = 0; index < scaffold.tracks.length; index += 1) {
        if (signal.aborted) return;
        const trackSpec = scaffold.tracks[index];
        const liveTrack = createdTracks[index];
        const progress = 28 + Math.round((index / scaffold.tracks.length) * 62);
        await update(`Writing ${trackSpec.name}`, progress);
        liveTrack.name = displayTrackName(scaffold, trackSpec);
        await insertStockDevices(liveTrack, trackSpec);
        await createTrackClips(liveTrack, trackSpec, baseBeat);
      }

      await update("Done", 100);
    }
  );

  console.log(
    `Generated ${scaffold.genre.label} scaffold in ${scaffold.key.label} at ${scaffold.tempo} BPM from seed "${scaffold.meta.seed}".`
  );

  return scaffold;
}

export type { ScaffoldOptions };
