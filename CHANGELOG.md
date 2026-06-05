# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- Genre Scaffold `0.1.2` package metadata and versioned `.ablx` output.
- Live-style key picker with 12 root choices and 35 supported scale options.
- Shared stock-device allowlist and validation coverage for every genre recipe.

### Changed

- Refined stock-device chains so recipes only request insertable Live devices.
- Labeled generated tracks with their actual initial stock device state.
- Reduced default space effects and added conservative effect parameter tuning.
- Updated README copy, examples, and the UI screenshot for the root/scale picker.

### Notes

- The Ableton Extensions SDK beta can insert built-in devices by name, but does not currently expose reliable ADG/preset, third-party VST, or global key/scale setters.
