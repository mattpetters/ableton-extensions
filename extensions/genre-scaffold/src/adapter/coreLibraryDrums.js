import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const AUDIO_EXTENSIONS = new Set([".wav", ".aif", ".aiff"]);
export const SIMPLER_TRIGGER_PITCH = 60;
export const POC_KICK_VELOCITY = 110;
export const POC_KICK_DURATION = 0.25;

const POC_KICK_SAMPLE_PREFERENCES = [
  "Samples/One Shots/Drums/Kick/Kick 909 ES.wav",
  "Samples/One Shots/Drums/Kick/Kick 808 Tone.aif",
  "Samples/One Shots/Drums/Kick/Kick 808 Hard.wav",
  "Samples/One Shots/Drums/Kick/Kick Garage.wav",
  "Samples/Multisamples/Drum Machines/909/Kick 909 Tune1.wav",
  "Samples/Multisamples/Drum Machines/808/Kick 808 Tone1 f.wav"
];

const DRUM_ROLE_BY_PITCH = new Map([
  [35, "kick"],
  [36, "kick"],
  [37, "rim"],
  [38, "snare"],
  [39, "clap"],
  [40, "snap"],
  [42, "closedHat"],
  [45, "tom"],
  [46, "openHat"],
  [47, "tom"],
  [54, "tambourine"],
  [63, "conga"],
  [64, "conga"],
  [70, "shaker"],
  [75, "perc"]
]);

const ROLE_SAMPLE_DIRS = {
  kick: ["Kick"],
  snare: ["Snare"],
  clap: ["Clap", "Snare"],
  rim: ["Rim", "Snare"],
  snap: ["Clap", "Rim", "Misc Percussion"],
  closedHat: ["Hihat"],
  openHat: ["Hihat", "Cymbal"],
  shaker: ["Shaker", "Hihat"],
  tambourine: ["Tambourine", "Shaker"],
  conga: ["Conga", "Bongo", "Misc Percussion"],
  tom: ["Tom"],
  perc: ["Electronic Percussion", "Misc Percussion", "Wood", "Bell", "Timbales"]
};

const ROLE_PATTERNS = {
  kick: [["kick"]],
  snare: [["snare"]],
  clap: [["clap"], ["snare"]],
  rim: [["rim"], ["snare"]],
  snap: [["snap"], ["clap"], ["rim"]],
  closedHat: [["closed", "hihat"], ["closed", "hat"], ["closed"], ["chh"], ["hihat"], ["hat"]],
  openHat: [["open", "hihat"], ["open", "hat"], ["open"], ["ohh"], ["cymbal"], ["hihat"], ["hat"]],
  shaker: [["shaker"], ["shake"], ["hihat"], ["hat"]],
  tambourine: [["tambourine"], ["tamb"], ["shaker"]],
  conga: [["conga"], ["bongo"], ["perc"]],
  tom: [["tom"], ["perc"]],
  perc: [["perc"], ["wood"], ["bell"], ["timbale"], ["rim"], ["hit"]]
};

const KIT_CANDIDATES = {
  "old-skool-house": [
    drumMachineKit("909 Core Kit", "909"),
    drumMachineKit("707 Core Kit", "707"),
    drumMachineKit("808 Core Kit", "808"),
    sampledKit("Chicago Kit", "Racks/Drum Racks/Electronic/Chicago Kit.adg", ["chicago", "909"])
  ],
  "tech-house": [
    drumMachineKit("909 Core Kit", "909"),
    drumMachineKit("707 Core Kit", "707"),
    sampledKit("AG Techno Kit", "Racks/Drum Racks/Electronic/AG Techno Kit.adg", ["techno", "909"]),
    sampledKit("Crisp Kit", "Racks/Drum Racks/Electronic/Crisp Kit.adg", ["crisp", "909"])
  ],
  "uk-garage": [
    sampledKit("Garage Kit", "Racks/Drum Racks/Electronic/Garage Kit.adg", ["garage", "707"]),
    drumMachineKit("707 Core Kit", "707"),
    drumMachineKit("909 Core Kit", "909"),
    drumMachineKit("606 Core Kit", "606")
  ],
  trap: [
    drumMachineKit("808 Core Kit", "808"),
    sampledKit("BNYX Boot Kit", "Racks/Drum Racks/Electronic/BNYX Boot Kit.adg", ["bnyx", "808", "trap"]),
    drumMachineKit("909 Core Kit", "909")
  ],
  "90s-hip-hop": [
    sampledKit("Boom Bap Kit", "Racks/Drum Racks/Sampled/Boom Bap Kit.adg", ["boom", "bap", "mpc", "vinyl"]),
    sampledKit("Golden Kit", "Racks/Drum Racks/Sampled/Golden Kit.adg", ["golden", "mpc", "vinyl"]),
    drumMachineKit("606 Core Kit", "606"),
    drumMachineKit("808 Core Kit", "808")
  ]
};

const PERC_CANDIDATES = [
  sampledKit("Percussion Core Kit", "Racks/Drum Racks/Acoustic/Percussion Core Kit.adg", ["perc", "conga", "shaker"]),
  sampledKit("Perc Kitchen Kit", "Racks/Drum Racks/Acoustic/Perc Kitchen Kit.adg", ["perc", "wood", "shaker"]),
  drumMachineKit("C78 Core Kit", "C78"),
  drumMachineKit("606 Core Kit", "606")
];

const scanCache = new Map();

function drumMachineKit(label, machine) {
  return {
    label,
    adgPath: `Racks/Drum Racks/Drum Machines/${label}.adg`,
    sampleDirs: [`Samples/Multisamples/Drum Machines/${machine}`],
    fallbackOneShots: true,
    preferredTerms: [machine]
  };
}

function sampledKit(label, adgPath, preferredTerms) {
  return {
    label,
    adgPath,
    sampleDirs: [],
    fallbackOneShots: true,
    preferredTerms: preferredTerms ?? label.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token && token !== "kit")
  };
}

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function existsDir(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function existsFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function audioFilesIn(dir) {
  if (!existsDir(dir)) {
    return [];
  }
  const cached = scanCache.get(dir);
  if (cached) {
    return cached;
  }

  const files = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  }

  files.sort();
  scanCache.set(dir, files);
  return files;
}

function expandHome(candidate) {
  if (candidate.startsWith("~/")) {
    return path.join(os.homedir(), candidate.slice(2));
  }
  return candidate;
}

function addRoot(roots, candidate) {
  const expanded = expandHome(candidate);
  if (existsDir(expanded)) {
    roots.add(expanded);
  }
}

function discoverApplicationCoreLibraries(roots) {
  if (process.platform !== "darwin" || !existsDir("/Applications")) {
    return;
  }

  let entries = [];
  try {
    entries = fs.readdirSync("/Applications", { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^Ableton Live.+\.app$/i.test(entry.name)) {
      continue;
    }
    addRoot(roots, path.join("/Applications", entry.name, "Contents/App-Resources/Core Library"));
  }
}

export function discoverCoreLibraryRoots(extraRoots = []) {
  const roots = new Set();
  for (const root of extraRoots) {
    addRoot(roots, root);
  }

  discoverApplicationCoreLibraries(roots);

  for (const root of [
    "/Applications/Ableton Live 12 Beta.app/Contents/App-Resources/Core Library",
    "/Applications/Ableton Live 12 Suite.app/Contents/App-Resources/Core Library",
    "/Applications/Ableton Live 12.app/Contents/App-Resources/Core Library",
    "/Applications/Ableton Live 11 Suite.app/Contents/App-Resources/Core Library",
    "/Applications/Ableton Live 11.app/Contents/App-Resources/Core Library",
    "~/Library/Application Support/Ableton/Core Library",
    "/Library/Application Support/Ableton/Core Library"
  ]) {
    addRoot(roots, root);
  }

  return [...roots];
}

function roleForPitch(pitch) {
  return DRUM_ROLE_BY_PITCH.get(pitch) ?? "perc";
}

function oneShotDirsForRole(coreRoot, role) {
  const folders = ROLE_SAMPLE_DIRS[role] ?? ROLE_SAMPLE_DIRS.perc;
  return folders.map((folder) => path.join(coreRoot, "Samples/One Shots/Drums", folder));
}

function filesForCandidate(coreRoot, candidate, usedRoles) {
  const files = [];
  for (const relativeDir of candidate.sampleDirs) {
    files.push(...audioFilesIn(path.join(coreRoot, relativeDir)));
  }
  if (candidate.fallbackOneShots) {
    const roles = usedRoles.length ? usedRoles : Object.keys(ROLE_SAMPLE_DIRS);
    for (const role of roles) {
      for (const dir of oneShotDirsForRole(coreRoot, role)) {
        files.push(...audioFilesIn(dir));
      }
    }
  }
  return [...new Set(files)];
}

function filesForAnyCoreSamples(coreRoot, usedRoles) {
  const files = [];
  for (const role of usedRoles) {
    for (const dir of oneShotDirsForRole(coreRoot, role)) {
      files.push(...audioFilesIn(dir));
    }
  }
  const drumMachinesRoot = path.join(coreRoot, "Samples/Multisamples/Drum Machines");
  files.push(...audioFilesIn(drumMachinesRoot));
  return [...new Set(files)];
}

function kickFallbackFiles(coreRoot) {
  return [
    path.join(coreRoot, "Samples/One Shots/Drums/Kick"),
    path.join(coreRoot, "Samples/Multisamples/Drum Machines/909"),
    path.join(coreRoot, "Samples/Multisamples/Drum Machines/808"),
    path.join(coreRoot, "Samples/Multisamples/Drum Machines")
  ].flatMap(audioFilesIn)
    .filter((file) => /\bkick\b/i.test(path.basename(file)) || /^kick/i.test(path.basename(file)))
    .sort((a, b) => scoreSample(b, ["909", "808", "kick"]) - scoreSample(a, ["909", "808", "kick"]) || a.localeCompare(b));
}

export function createSimplerTriggerNote(startTime = 0) {
  return {
    pitch: SIMPLER_TRIGGER_PITCH,
    startTime,
    duration: POC_KICK_DURATION,
    velocity: POC_KICK_VELOCITY
  };
}

export function resolvePocKickSample(options = {}) {
  const coreRoots = options.discoverDefaults === false
    ? [...new Set((options.coreLibraryRoots ?? []).map(expandHome).filter(existsDir))]
    : discoverCoreLibraryRoots(options.coreLibraryRoots ?? []);
  if (!coreRoots.length) {
    return {
      samplePath: undefined,
      fileName: undefined,
      coreRoot: undefined,
      sourceLabel: "Core Library missing",
      warnings: ["Ableton Core Library was not found. Checked installed Live application bundles and common Core Library folders."],
      searchedRoots: []
    };
  }

  for (const coreRoot of coreRoots) {
    for (const relativePath of POC_KICK_SAMPLE_PREFERENCES) {
      const samplePath = path.join(coreRoot, relativePath);
      if (existsFile(samplePath)) {
        return {
          samplePath,
          fileName: path.basename(samplePath),
          coreRoot,
          sourceLabel: "preferred Core Library kick",
          warnings: [],
          searchedRoots: coreRoots
        };
      }
    }
  }

  for (const coreRoot of coreRoots) {
    const fallback = kickFallbackFiles(coreRoot)[0];
    if (fallback) {
      return {
        samplePath: fallback,
        fileName: path.basename(fallback),
        coreRoot,
        sourceLabel: "fallback Core Library kick",
        warnings: ["Preferred POC kick samples were not found, so Genre Scaffold used the best matching Core Library kick sample."],
        searchedRoots: coreRoots
      };
    }
  }

  return {
    samplePath: undefined,
    fileName: undefined,
    coreRoot: coreRoots[0],
    sourceLabel: "Kick sample missing",
    warnings: ["Core Library was found, but no usable kick audio sample was found."],
    searchedRoots: coreRoots
  };
}

function sampleTokens(file) {
  return path.basename(file, path.extname(file))
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function fileMatches(file, pattern) {
  const tokens = sampleTokens(file);
  return pattern.every((part) => {
    const normalized = normalize(part);
    return tokens.some((token) => (
      token === normalized ||
      (normalized.length >= 4 && token.startsWith(normalized)) ||
      (normalized === "perc" && token.startsWith("percussion")) ||
      (normalized === "rim" && token.startsWith("rimshot"))
    ));
  });
}

function scoreSample(file, preferredTerms) {
  const tokens = sampleTokens(file);
  const parent = normalize(path.basename(path.dirname(file)));
  let score = 0;
  for (const [index, term] of preferredTerms.entries()) {
    const normalized = normalize(term);
    const weight = Math.max(30, 100 - index * 12);
    if (tokens.includes(normalized)) {
      score += weight;
    } else if (tokens.some((token) => token.startsWith(normalized))) {
      score += Math.round(weight * 0.6);
    } else if (parent.includes(normalized)) {
      score += Math.round(weight * 0.25);
    }
  }
  return score;
}

function bestMatch(files, preferredTerms) {
  return files
    .map((file) => ({ file, score: scoreSample(file, preferredTerms) }))
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file))[0]?.file;
}

function pickSample(files, role, usedFiles, preferredTerms) {
  const patternGroups = ROLE_PATTERNS[role] ?? ROLE_PATTERNS.perc;
  for (const pattern of patternGroups) {
    const unusedMatch = bestMatch(
      files.filter((file) => !usedFiles.has(file) && fileMatches(file, pattern)),
      preferredTerms
    );
    if (unusedMatch) {
      usedFiles.add(unusedMatch);
      return { path: unusedMatch, match: pattern.join(" ") };
    }
    const match = bestMatch(files.filter((file) => fileMatches(file, pattern)), preferredTerms);
    if (match) {
      return { path: match, match: pattern.join(" ") };
    }
  }

  const fallback = files.find((file) => !usedFiles.has(file)) ?? files[0];
  if (!fallback) {
    return null;
  }
  usedFiles.add(fallback);
  return { path: fallback, match: "fallback" };
}

function createAssignments(files, usedPitches, sourceLabel, preferredTerms = []) {
  const usedFiles = new Set();
  const assignments = [];
  const missing = [];

  for (const pitch of usedPitches) {
    const role = roleForPitch(pitch);
    const picked = pickSample(files, role, usedFiles, preferredTerms);
    if (!picked) {
      missing.push({ pitch, role });
      continue;
    }
    assignments.push({
      pitch,
      role,
      filePath: picked.path,
      fileName: path.basename(picked.path),
      sourceLabel,
      matchedBy: picked.match
    });
  }

  return { assignments, missing };
}

function candidatesFor({ genreId, trackRole, trackName }) {
  if (trackRole === "perc" || normalize(trackName).includes("perc")) {
    return PERC_CANDIDATES;
  }
  return KIT_CANDIDATES[genreId] ?? KIT_CANDIDATES["old-skool-house"];
}

function createPlan({ coreRoot, candidate, usedPitches, files, warnings, fallbackReason }) {
  const sourceLabel = candidate.label;
  const { assignments, missing } = createAssignments(files, usedPitches, sourceLabel, candidate.preferredTerms ?? []);
  const adgFullPath = candidate.adgPath ? path.join(coreRoot, candidate.adgPath) : undefined;
  const kitPresetFound = adgFullPath ? existsFile(adgFullPath) : false;
  const planWarnings = [...warnings];

  if (candidate.adgPath && !kitPresetFound) {
    planWarnings.push(`${candidate.label} preset was not found at ${candidate.adgPath}.`);
  }
  if (fallbackReason) {
    planWarnings.push(fallbackReason);
  }
  if (missing.length) {
    const missingText = missing.map((item) => `${item.role} (${item.pitch})`).join(", ");
    planWarnings.push(`Missing samples for ${missingText}; those pads need manual samples.`);
  }

  return {
    coreRoot,
    kitLabel: candidate.label,
    kitPresetPath: kitPresetFound ? adgFullPath : undefined,
    shortLabel: `${candidate.label.replace(/ Kit$/i, "")} core samples`,
    assignments,
    missing,
    warnings: planWarnings,
    swapInstructions: "To customize: unfold the Drum Rack, select a pad or Simpler, then drag in any sample or replace the Simpler sample."
  };
}

export function resolveDrumSamplePlan(options = {}) {
  const usedPitches = [...new Set((options.usedPitches ?? []).map(Number).filter((pitch) => Number.isInteger(pitch)))]
    .sort((a, b) => a - b);

  if (!usedPitches.length) {
    return {
      assignments: [],
      missing: [],
      warnings: ["No drum MIDI notes were generated for this track."],
      shortLabel: "No drum notes",
      swapInstructions: "Add MIDI notes to the track, then load or replace Drum Rack pad samples."
    };
  }

  const coreRoots = discoverCoreLibraryRoots(options.coreLibraryRoots ?? []);
  if (!coreRoots.length) {
    return {
      assignments: [],
      missing: usedPitches.map((pitch) => ({ pitch, role: roleForPitch(pitch) })),
      warnings: [
        "Ableton Core Library was not found. Checked installed Live application bundles and common Core Library folders."
      ],
      shortLabel: "Core Library missing",
      swapInstructions: "Open the Drum Rack and drag any samples onto the active pads to make this track audible."
    };
  }

  const usedRoles = [...new Set(usedPitches.map(roleForPitch))];
  let bestPlan;

  for (const coreRoot of coreRoots) {
    for (const candidate of candidatesFor(options)) {
      const files = filesForCandidate(coreRoot, candidate, usedRoles);
      if (!files.length) {
        continue;
      }

      const plan = createPlan({ coreRoot, candidate, usedPitches, files, warnings: [] });
      if (!bestPlan || plan.assignments.length > bestPlan.assignments.length) {
        bestPlan = plan;
      }
      if (!plan.missing.length) {
        return plan;
      }
    }

    const files = filesForAnyCoreSamples(coreRoot, usedRoles);
    if (!files.length) {
      continue;
    }
    const fallbackPlan = createPlan({
      coreRoot,
      candidate: { label: "Core Library drum one-shots", fallbackOneShots: true },
      usedPitches,
      files,
      warnings: [],
      fallbackReason: "No preferred kit had complete samples, so Genre Scaffold used the first matching Core Library drum samples it could find."
    });
    if (!bestPlan || fallbackPlan.assignments.length > bestPlan.assignments.length) {
      bestPlan = fallbackPlan;
    }
    if (!fallbackPlan.missing.length) {
      return fallbackPlan;
    }
  }

  return bestPlan ?? {
    assignments: [],
    missing: usedPitches.map((pitch) => ({ pitch, role: roleForPitch(pitch) })),
    warnings: ["Core Library was found, but no usable drum audio samples were found."],
    shortLabel: "Samples missing",
    swapInstructions: "Open the Drum Rack and drag any samples onto the active pads to make this track audible."
  };
}

export function summarizeDrumSamplePlan(plan) {
  const loaded = plan.assignments?.length ?? 0;
  const missing = plan.missing?.length ?? 0;
  const source = plan.kitPresetPath
    ? `${plan.kitLabel} target found (${path.basename(plan.kitPresetPath)}); pads populated from Core Library samples`
    : `${plan.kitLabel} sample search`;
  const suffix = missing ? ` ${missing} pad(s) still need samples.` : "";
  return `Loaded ${loaded} Drum Rack pad sample(s) using ${source}.${suffix}`;
}
