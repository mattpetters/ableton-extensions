const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const version = manifest.version;
const outputDir = "dist";
const outputFile = path.join(outputDir, `genre-scaffold_${version}.ablx`);

fs.mkdirSync(outputDir, { recursive: true });

for (const file of fs.readdirSync(outputDir)) {
  if (/^genre-scaffold(?:_[0-9][0-9A-Za-z.-]*)?\.ablx$/.test(file)) {
    fs.rmSync(path.join(outputDir, file));
  }
}

const result = spawnSync("extensions-cli", ["package", "-o", outputFile], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
