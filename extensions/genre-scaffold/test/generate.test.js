import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createSimplerTriggerNote,
  resolveDrumSamplePlan,
  resolvePocKickSample,
  SIMPLER_TRIGGER_PITCH
} from "../src/adapter/coreLibraryDrums.js";
import { generateScaffold, writeMidiFile } from "../src/index.js";
import { isPitchInScale, parseKey, SCALES } from "../src/lib/theory.js";
import { listGenres } from "../src/genres/index.js";
import { INSERTABLE_STOCK_DEVICE_SET } from "../src/stockDevices.js";

const LIVE_ROOT_VALUES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

test("all MVP genres generate non-empty stock-only scaffolds", () => {
  for (const genre of listGenres()) {
    const scaffold = generateScaffold({
      genre,
      key: "F minor",
      bars: 16,
      seed: "validation",
      density: "balanced",
      energy: "medium"
    });

    assert.equal(scaffold.meta.stockOnly, true);
    assert.equal(scaffold.sections.reduce((sum, section) => sum + section.bars, 0), 16);
    assert.equal(scaffold.tracks.length, 5);

    for (const track of scaffold.tracks) {
      assert.ok(track.stockDevices.length > 0, `${genre} ${track.name} should include stock devices`);
      for (const deviceName of track.stockDevices) {
        assert.ok(
          INSERTABLE_STOCK_DEVICE_SET.has(deviceName),
          `${genre} ${track.name} uses non-insertable stock device "${deviceName}"`
        );
      }
      assert.ok(track.clips.length > 0, `${genre} ${track.name} should include clips`);
      const noteCount = track.clips.reduce((sum, clip) => sum + clip.notes.length, 0);
      assert.ok(noteCount > 0, `${genre} ${track.name} should include notes`);
    }
  }
});

test("seeded generation is deterministic", () => {
  const first = generateScaffold({ genre: "uk-garage", key: "F minor", bars: 16, seed: "same" });
  const second = generateScaffold({ genre: "uk-garage", key: "F minor", bars: 16, seed: "same" });
  assert.deepEqual(first, second);
});

test("different seeds produce useful variation", () => {
  const first = generateScaffold({ genre: "tech-house", key: "A minor", bars: 16, seed: "one" });
  const second = generateScaffold({ genre: "tech-house", key: "A minor", bars: 16, seed: "two" });
  assert.notDeepEqual(first.tracks, second.tracks);
});

test("Live-style root values and supported scale names parse cleanly", () => {
  for (const root of LIVE_ROOT_VALUES) {
    for (const scaleName of Object.keys(SCALES)) {
      const key = parseKey(`${root} ${scaleName}`);
      assert.equal(key.root, root);
      assert.equal(key.scaleName, scaleName);
    }
  }
});

test("melodic tracks mostly stay inside the requested scale", () => {
  const scaffold = generateScaffold({ genre: "trap", key: "F# minor", bars: 16, seed: "scale-check" });
  const melodicNotes = scaffold.tracks
    .filter((track) => track.role !== "drums" && track.role !== "perc")
    .flatMap((track) => track.clips.flatMap((clip) => clip.notes));

  const inScale = melodicNotes.filter((note) => isPitchInScale(scaffold.key, note.pitch));
  assert.ok(inScale.length / melodicNotes.length > 0.92);
});

test("MIDI writer emits a standard MIDI file", () => {
  const scaffold = generateScaffold({ genre: "90s-hip-hop", key: "D minor", bars: 16, seed: "midi" });
  const midi = writeMidiFile(scaffold);
  assert.equal(midi.subarray(0, 4).toString("ascii"), "MThd");
  assert.ok(midi.includes(Buffer.from("MTrk")));
  assert.ok(midi.length > 256);
});

test("drum sample planner prefers matching Core Library drum machine samples", () => {
  const coreRoot = makeMockCoreLibrary({
    "Racks/Drum Racks/Drum Machines/909 Core Kit.adg": "",
    "Samples/Multisamples/Drum Machines/909/Kick 909.wav": "",
    "Samples/Multisamples/Drum Machines/909/Snare 909.wav": "",
    "Samples/One Shots/Drums/Hihat/Hihat Open 909.aif": "",
    "Samples/One Shots/Drums/Clap/Clap 909.wav": ""
  });

  const plan = resolveDrumSamplePlan({
    genreId: "old-skool-house",
    trackRole: "drums",
    trackName: "Drums - 909 House Pattern",
    usedPitches: [36, 39, 46],
    coreLibraryRoots: [coreRoot]
  });

  assert.equal(plan.kitLabel, "909 Core Kit");
  assert.equal(plan.assignments.length, 3);
  assert.ok(plan.assignments.some((assignment) => assignment.fileName.includes("Kick 909")));
  assert.ok(plan.assignments.some((assignment) => assignment.fileName.includes("Clap 909")));
  assert.ok(plan.shortLabel.includes("909"));
});

test("drum sample planner falls through to any matching one-shots when the target preset is missing", () => {
  const coreRoot = makeMockCoreLibrary({
    "Samples/One Shots/Drums/Kick/Kick Fallback.wav": "",
    "Samples/One Shots/Drums/Snare/Snare Fallback.wav": "",
    "Samples/One Shots/Drums/Hihat/Hihat Closed Fallback.wav": ""
  });

  const plan = resolveDrumSamplePlan({
    genreId: "tech-house",
    trackRole: "drums",
    trackName: "Drums - Tight Club Pattern",
    usedPitches: [36, 38, 42],
    coreLibraryRoots: [coreRoot]
  });

  assert.equal(plan.assignments.length, 3);
  assert.ok(plan.warnings.some((warning) => warning.includes("909 Core Kit preset was not found")));
});

test("POC kick sample resolver prefers a known Core Library kick", () => {
  const coreRoot = makeMockCoreLibrary({
    "Samples/One Shots/Drums/Kick/Kick 909 ES.wav": "",
    "Samples/One Shots/Drums/Kick/Kick Other.wav": ""
  });

  const result = resolvePocKickSample({
    coreLibraryRoots: [coreRoot],
    discoverDefaults: false
  });

  assert.equal(result.fileName, "Kick 909 ES.wav");
  assert.equal(result.sourceLabel, "preferred Core Library kick");
  assert.equal(result.warnings.length, 0);
});

test("POC kick sample resolver reports a clear failure when no kick exists", () => {
  const coreRoot = makeMockCoreLibrary({
    "Samples/One Shots/Drums/Snare/Snare Only.wav": ""
  });

  const result = resolvePocKickSample({
    coreLibraryRoots: [coreRoot],
    discoverDefaults: false
  });

  assert.equal(result.samplePath, undefined);
  assert.ok(result.warnings.some((warning) => warning.includes("no usable kick")));
});

test("POC Simpler trigger note uses neutral pitch 60", () => {
  const note = createSimplerTriggerNote();
  assert.equal(SIMPLER_TRIGGER_PITCH, 60);
  assert.deepEqual(note, {
    pitch: 60,
    startTime: 0,
    duration: 0.25,
    velocity: 110
  });
});

function makeMockCoreLibrary(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "genre-scaffold-core-"));
  for (const [relativePath, contents] of Object.entries(files)) {
    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, contents);
  }
  return root;
}
