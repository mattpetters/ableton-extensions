# Genre Scaffold

Stock-first MIDI, composition, tempo, and arrangement generation for Ableton Live Extensions.

Genre Scaffold creates a useful starting session from a small set of musical choices. It is aimed at producers who want a genre-appropriate first draft with enough structure to start editing immediately, while still leaving room for experimentation.

![Genre Scaffold UI](../../assets/screenshots/genre-scaffold-ui.png)

## Status

MVP packaged, browser-tested, and in-Live smoke tested. Generation tests pass across all five MVP genres, including two seeded rounds per genre to confirm meaningful variation.

Remaining release checks:

- Reinstall the latest versioned `.ablx`
- Run one generation per genre in Live with the stock-device polish pass
- Run a second generation per genre in Live and inspect the musical difference

## Features

- Ableton modal UI with genre, root, scale, length, tempo, energy, density, and seed controls
- Generates drums, bass, harmony, lead/chop, and percussion or FX MIDI roles
- Creates arrangement sections and cue points
- Sets project tempo from the selected genre or manual override
- Uses deterministic seeds for repeatable variations
- Stays stock-only for V0, with insertable Ableton stock-device chains
- Labels generated tracks with the actual initial stock device, such as `Init Drum Rack`
- Applies conservative parameter tuning to inserted effects when Live exposes matching parameters
- Ships with a CLI that writes `.json` scaffold data and multitrack `.mid` files

## Genres

- Old Skool House
- Tech House
- UK Garage
- Trap
- 90s Hip Hop

## Setup

Requirements:

- Ableton Live 12 Beta with Extensions Developer Mode enabled
- Node.js `24.14.1` or newer
- The Ableton Extensions SDK and CLI tarballs in `vendor/`; see [vendor/README.md](vendor/README.md)

Install dependencies:

```sh
cd extensions/genre-scaffold
npm install
cp .env.example .env
```

Update `.env` if your Ableton Live Beta app lives somewhere else:

```sh
EXTENSION_HOST_PATH=/Applications/Ableton Live 12 Beta.app/Contents/Helpers/ExtensionHost/ExtensionHostNodeModule.node
```

## Run In Live During Development

Developer Mode changes how extensions are loaded. When Developer Mode is enabled, Live shuts down the Live-managed Extension Host and expects you to run the host yourself.

Use this workflow while developing:

1. Enable Developer Mode in Live Preferences or Settings > Extensions.
2. Start the extension host from this extension folder:

```sh
npm start
```

3. Keep that process running while testing context menus in Live.

You should see output like:

```text
Starting Extension Host...
[Genre Scaffold]: Genre Scaffold activated.
```

If Developer Mode is on and `npm start` is not running, the extension can appear in Live's installed extensions list but its context menu actions will not be active.

## Run Installed Package

For installed `.ablx` testing, disable Developer Mode, restart Live Beta, and let Live run the installed extension host.

Then use the extension from a MIDI track or MIDI arrangement selection context menu:

```text
Generate Genre Scaffold
```

The easiest triggers are:

- Arrangement View: select a time range on a MIDI track, then right-click inside the selected region
- Session View: right-click a clip slot on a MIDI track
- Arrangement View: right-click an existing MIDI clip
- Arrangement View: right-click a MIDI track header

The extension opens the options modal, then creates tracks, clips, notes, section markers, and tempo.

## Package

Build and package an installable Ableton extension:

```sh
npm run package
```

The package is written with the current manifest version in the filename:

```text
dist/genre-scaffold_<version>.ablx
```

Install it by adding the `.ablx` package from Ableton Live Beta Preferences or Settings > Extensions.

## CLI

Generate scaffold JSON and MIDI without Ableton:

```sh
npm run generate -- --genre uk-garage --key "F minor" --bars 16 --seed hot-iron --out examples/ukg
```

This writes:

- `examples/ukg.json`
- `examples/ukg.mid`

Useful options:

- `--genre`: `old-skool-house`, `tech-house`, `uk-garage`, `trap`, `90s-hip-hop`
- `--key`: root and optional scale, such as `C minor`, `F# minor`, `D dorian`, `A major`, or `G mixolydian`
- `--scale`: override the scale in `--key`
- `--tempo`: exact BPM, otherwise the genre default is used
- `--bars`: usually `8`, `16`, `32`, or `64`
- `--density`: `sparse`, `balanced`, or `busy`
- `--energy`: `low`, `medium`, or `high`
- `--seed`: deterministic variation seed
- `--out`: output path without extension

## Validation

Run unit tests:

```sh
npm test
```

Run the two-round variation report:

```sh
npm run validate:generations
```

The validation checks that every MVP genre generates enough MIDI material, keeps arrangement length intact, and changes at least two tracks between different seeds.

## Notes

- V0 does not require third-party samples, packs, or VSTs.
- The SDK beta exposes song key/scale as read-only, so key currently controls generated MIDI but does not update Live's global key/scale UI.
- The SDK beta can insert built-in Live devices by name, but does not currently expose reliable ADG/preset or third-party VST loading.
- Drum Rack tracks are labeled as initialized racks and carry suggested kit/preset notes in the scaffold data for future advanced-mode selection.
- Advanced mode is planned for per-role stock instrument choices, preferred racks/presets, user sample packs, and VST preset swaps once those loading paths are validated.
