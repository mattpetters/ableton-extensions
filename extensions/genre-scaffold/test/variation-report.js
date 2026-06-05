import assert from "node:assert/strict";
import { generateScaffold } from "../src/index.js";
import { listGenres } from "../src/genres/index.js";

const DEFAULT_KEYS = {
  "old-skool-house": "C minor",
  "tech-house": "A minor",
  "uk-garage": "F minor",
  trap: "F# minor",
  "90s-hip-hop": "D minor"
};

function trackSignature(track) {
  const notes = track.clips.flatMap((clip) =>
    clip.notes.map((note) => `${clip.startBar}:${note.pitch}:${note.start}:${note.duration}:${note.velocity}`)
  );
  return notes.join("|");
}

function scaffoldStats(scaffold) {
  const notes = scaffold.tracks.flatMap((track) => track.clips.flatMap((clip) => clip.notes));
  const pitches = new Set(notes.map((note) => note.pitch));
  const starts = new Set(notes.map((note) => note.start));
  return {
    tracks: scaffold.tracks.length,
    clips: scaffold.tracks.reduce((sum, track) => sum + track.clips.length, 0),
    notes: notes.length,
    pitches: pitches.size,
    starts: starts.size
  };
}

function changedTracks(first, second) {
  return first.tracks.filter((track, index) => trackSignature(track) !== trackSignature(second.tracks[index])).length;
}

for (const genre of listGenres()) {
  const first = generateScaffold({
    genre,
    key: DEFAULT_KEYS[genre],
    bars: 16,
    seed: "round-one",
    density: "balanced",
    energy: "medium"
  });
  const second = generateScaffold({
    genre,
    key: DEFAULT_KEYS[genre],
    bars: 16,
    seed: "round-two",
    density: "balanced",
    energy: "medium"
  });

  const firstStats = scaffoldStats(first);
  const secondStats = scaffoldStats(second);
  const changed = changedTracks(first, second);

  assert.equal(first.sections.reduce((sum, section) => sum + section.bars, 0), 16);
  assert.equal(second.sections.reduce((sum, section) => sum + section.bars, 0), 16);
  assert.equal(first.tracks.length, 5);
  assert.equal(second.tracks.length, 5);
  assert.ok(firstStats.notes > 60, `${genre} round one should contain enough MIDI material`);
  assert.ok(secondStats.notes > 60, `${genre} round two should contain enough MIDI material`);
  assert.ok(changed >= 2, `${genre} should materially change at least two tracks between seeds`);

  console.log(
    `${genre.padEnd(16)} round-one notes=${String(firstStats.notes).padStart(4)} pitches=${String(firstStats.pitches).padStart(2)} starts=${String(firstStats.starts).padStart(2)} | round-two notes=${String(secondStats.notes).padStart(4)} pitches=${String(secondStats.pitches).padStart(2)} starts=${String(secondStats.starts).padStart(2)} | changedTracks=${changed}/5`
  );
}
