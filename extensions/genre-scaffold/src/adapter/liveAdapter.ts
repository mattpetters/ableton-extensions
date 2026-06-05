import {
  DrumChain,
  DrumRack,
  Simpler,
  type Chain,
  Device,
  DeviceParameter,
  ExtensionContext,
  MidiTrack,
  NoteDescription
} from "@ableton-extensions/sdk";
import { generateScaffold } from "../generateScaffold.js";
import { INSERTABLE_STOCK_DEVICE_SET } from "../stockDevices.js";
import { resolveDrumSamplePlan, summarizeDrumSamplePlan } from "./coreLibraryDrums.js";

const GENRE_SCAFFOLD_VERSION = "0.1.3";

type ScaffoldOptions = {
  genre: string;
  key: string;
  bars: number;
  density: "sparse" | "balanced" | "busy";
  energy: "low" | "medium" | "high";
  seed: string;
  tempo?: number;
  includeTrackNotes?: boolean;
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
  suggestedPreset?: string;
  soundNotes?: string;
  description: string;
  generatedBy?: string;
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

type ParameterTuning = {
  names: string[];
  normalized: number;
};

type DeviceInsertReport = {
  drumRackLabel?: string;
  notes: string[];
};

const DEVICE_TUNINGS: Record<string, ParameterTuning[]> = {
  "Auto Filter": [
    { names: ["Resonance"], normalized: 0.18 }
  ],
  "Auto Pan": [
    { names: ["Amount"], normalized: 0.18 },
    { names: ["Rate"], normalized: 0.25 }
  ],
  Compressor: [
    { names: ["Threshold"], normalized: 0.58 },
    { names: ["Ratio"], normalized: 0.28 }
  ],
  Delay: [
    { names: ["Dry/Wet"], normalized: 0.12 },
    { names: ["Feedback"], normalized: 0.16 }
  ],
  "Drum Buss": [
    { names: ["Drive"], normalized: 0.18 },
    { names: ["Boom"], normalized: 0 },
    { names: ["Damp"], normalized: 0.55 },
    { names: ["Dry/Wet"], normalized: 0.62 }
  ],
  Echo: [
    { names: ["Dry/Wet"], normalized: 0.12 },
    { names: ["Feedback"], normalized: 0.16 }
  ],
  "Glue Compressor": [
    { names: ["Threshold"], normalized: 0.58 },
    { names: ["Makeup"], normalized: 0.5 },
    { names: ["Dry/Wet"], normalized: 0.7 }
  ],
  "Hybrid Reverb": [
    { names: ["Dry/Wet"], normalized: 0.08 },
    { names: ["Decay", "Decay Time"], normalized: 0.18 }
  ],
  Reverb: [
    { names: ["Dry/Wet"], normalized: 0.1 },
    { names: ["Decay", "Decay Time"], normalized: 0.2 }
  ],
  Saturator: [
    { names: ["Drive"], normalized: 0.14 },
    { names: ["Dry/Wet"], normalized: 0.55 }
  ],
  "Vinyl Distortion": [
    { names: ["Drive"], normalized: 0.16 },
    { names: ["Crackle"], normalized: 0.08 }
  ]
};

function toNoteDescription(note: ScaffoldNote): NoteDescription {
  return {
    pitch: note.pitch,
    startTime: note.start,
    duration: note.duration,
    velocity: note.velocity ?? 90
  };
}

function displayTrackName(scaffold: Scaffold, track: ScaffoldTrack, generatedDeviceLabel?: string) {
  const primaryDevice = track.stockDevices[0] ?? "MIDI";
  const deviceLabel = generatedDeviceLabel ?? (
    primaryDevice === "Drum Rack" ? "Building Drum Rack" : `Init ${primaryDevice}`
  );
  return `${scaffold.genre.label} | ${track.name} | ${deviceLabel} | GS ${GENRE_SCAFFOLD_VERSION}`;
}

function preferredDevices(track: ScaffoldTrack) {
  return track.stockDevices
    .filter((name) => INSERTABLE_STOCK_DEVICE_SET.has(name))
    .slice(0, 4);
}

function normalizedName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findParameter(parameters: DeviceParameter<"1.0.0">[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizedName);
  return parameters.find((parameter) => {
    const parameterName = normalizedName(parameter.name);
    return normalizedAliases.some((alias) => parameterName === alias);
  }) ?? parameters.find((parameter) => {
    const parameterName = normalizedName(parameter.name);
    return normalizedAliases.some((alias) => parameterName.includes(alias));
  });
}

async function setParameterNormalized(parameter: DeviceParameter<"1.0.0">, normalized: number) {
  const clamped = Math.min(1, Math.max(0, normalized));
  const min = parameter.min;
  const max = parameter.max;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return;
  await parameter.setValue(min + (max - min) * clamped);
}

async function tuneInsertedDevice(device: Device<"1.0.0">, requestedName: string, track: ScaffoldTrack) {
  const tunings = DEVICE_TUNINGS[requestedName];
  if (!tunings) return;

  for (const tuning of tunings) {
    const parameter = findParameter(device.parameters, tuning.names);
    if (!parameter) continue;
    try {
      await setParameterNormalized(parameter, tuning.normalized);
    } catch (error) {
      console.warn(`Could not tune "${parameter.name}" on "${track.name}".`, error);
    }
  }
}

function generatedTrackNotes(scaffold: Scaffold, track: ScaffoldTrack, deviceReport?: DeviceInsertReport) {
  const notes = [
    `Generated by Genre Scaffold v${GENRE_SCAFFOLD_VERSION}.`,
    `${scaffold.genre.label} in ${scaffold.key.label} at ${scaffold.tempo} BPM.`,
    track.description
  ];
  if (track.suggestedPreset) {
    notes.push(track.suggestedPreset);
  }
  if (track.soundNotes) {
    notes.push(track.soundNotes);
  }
  if (deviceReport?.notes.length) {
    notes.push(...deviceReport.notes);
  }
  return notes.filter(Boolean).join(" ");
}

function usedDrumPitches(track: ScaffoldTrack) {
  return [...new Set(track.clips.flatMap((clip) => clip.notes.map((note) => note.pitch)))]
    .sort((a, b) => a - b);
}

async function insertSimplerSample(
  context: ExtensionContext<"1.0.0">,
  chain: Chain<"1.0.0">,
  samplePath: string
) {
  const inserted = await chain.insertDevice("Simpler", 0);
  if (!(inserted instanceof Simpler) && typeof (inserted as Simpler<"1.0.0">).replaceSample !== "function") {
    throw new Error("Live inserted Simpler but the SDK did not return a Simpler object.");
  }
  const importedSamplePath = await context.resources.importIntoProject(samplePath);
  await (inserted as Simpler<"1.0.0">).replaceSample(importedSamplePath);
}

function isWritableDrumRack(device: Device<"1.0.0">): device is DrumRack<"1.0.0"> {
  const candidate = device as DrumRack<"1.0.0">;
  return device instanceof DrumRack || (
    Array.isArray(candidate.chains) &&
    typeof candidate.insertChain === "function"
  );
}

async function populateDrumRack(
  context: ExtensionContext<"1.0.0">,
  drumRack: DrumRack<"1.0.0">,
  scaffold: Scaffold,
  track: ScaffoldTrack
): Promise<DeviceInsertReport> {
  const samplePlan = resolveDrumSamplePlan({
    genreId: scaffold.genre.id,
    genreLabel: scaffold.genre.label,
    trackRole: track.role,
    trackName: track.name,
    usedPitches: usedDrumPitches(track)
  });

  const report: DeviceInsertReport = {
    drumRackLabel: samplePlan.shortLabel,
    notes: [summarizeDrumSamplePlan(samplePlan), samplePlan.swapInstructions]
  };

  for (const warning of samplePlan.warnings ?? []) {
    report.notes.push(warning);
    console.warn(`[Genre Scaffold] ${track.name}: ${warning}`);
  }

  let loaded = 0;
  for (const assignment of samplePlan.assignments ?? []) {
    try {
      const chain = await drumRack.insertChain(drumRack.chains.length);
      if (chain instanceof DrumChain || "receivingNote" in chain) {
        (chain as DrumChain<"1.0.0">).receivingNote = assignment.pitch;
      }
      await insertSimplerSample(context, chain, assignment.filePath);
      loaded += 1;
    } catch (error) {
      const note = `Could not load ${assignment.fileName} on MIDI note ${assignment.pitch}; replace that pad manually.`;
      report.notes.push(note);
      console.warn(`[Genre Scaffold] ${track.name}: ${note}`, error);
    }
  }

  if (loaded === 0) {
    report.drumRackLabel = "Needs samples";
  } else if (loaded < (samplePlan.assignments?.length ?? 0)) {
    report.drumRackLabel = `${samplePlan.shortLabel}, partial`;
  }

  console.info(`[Genre Scaffold] ${track.name}: ${report.notes.join(" ")}`);
  return report;
}

async function insertStockDevices(
  context: ExtensionContext<"1.0.0">,
  liveTrack: MidiTrack<"1.0.0">,
  scaffold: Scaffold,
  track: ScaffoldTrack
): Promise<DeviceInsertReport> {
  const devices = preferredDevices(track);
  const report: DeviceInsertReport = { notes: [] };
  for (const [index, deviceName] of devices.entries()) {
    try {
      const device = await liveTrack.insertDevice(deviceName, index);
      if (deviceName === "Drum Rack") {
        if (isWritableDrumRack(device)) {
          const drumReport = await populateDrumRack(context, device, scaffold, track);
          report.drumRackLabel = drumReport.drumRackLabel;
          report.notes.push(...drumReport.notes);
        } else {
          const note = "Live inserted Drum Rack, but the SDK did not expose it as a DrumRack object, so pads could not be populated.";
          report.drumRackLabel = "Needs samples";
          report.notes.push(note);
          console.warn(`[Genre Scaffold] ${track.name}: ${note}`);
        }
      }
      await tuneInsertedDevice(device, deviceName, track);
    } catch (error) {
      console.warn(`Could not insert stock device "${deviceName}" on "${track.name}".`, error);
    }
  }
  return report;
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
        const deviceReport = await insertStockDevices(context, liveTrack, scaffold, trackSpec);
        liveTrack.name = displayTrackName(scaffold, trackSpec, deviceReport.drumRackLabel);
        await createTrackClips(liveTrack, trackSpec, baseBeat);
        if (options.includeTrackNotes ?? true) {
          console.info(`[Genre Scaffold] Track note for "${liveTrack.name}": ${generatedTrackNotes(scaffold, trackSpec, deviceReport)}`);
        }
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
