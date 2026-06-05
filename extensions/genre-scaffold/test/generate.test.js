import assert from "node:assert/strict";
import test from "node:test";
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
