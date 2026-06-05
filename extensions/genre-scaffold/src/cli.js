#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { generateScaffold } from "./generateScaffold.js";
import { writeMidiFile } from "./lib/midi.js";
import { listGenres } from "./genres/index.js";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      continue;
    }
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function printHelp() {
  console.log(`Ableton Genre Scaffold

Usage:
  node src/cli.js --genre uk-garage --key "F minor" --bars 16 --seed demo --out examples/ukg

Genres:
  ${listGenres().join(", ")}
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const scaffold = generateScaffold({
    genre: args.genre,
    key: args.key,
    scale: args.scale,
    tempo: args.tempo,
    bars: args.bars,
    density: args.density,
    energy: args.energy,
    seed: args.seed
  });

  if (!args.out) {
    console.log(JSON.stringify(scaffold, null, 2));
    return;
  }

  const outputBase = resolve(String(args.out));
  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(scaffold, null, 2)}\n`);
  await writeFile(`${outputBase}.mid`, writeMidiFile(scaffold));
  console.log(`Wrote ${outputBase}.json`);
  console.log(`Wrote ${outputBase}.mid`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
