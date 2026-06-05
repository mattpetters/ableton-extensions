import { makeClip } from "../lib/patterns.js";

export function createTrack({ id, name, role, stockDevices, description, clips }) {
  return {
    id,
    name,
    role,
    stockDevices,
    description,
    clips: clips.filter((clip) => clip.notes.length > 0)
  };
}

export function sectionClips(ctx, roleName, renderSection, describeSection) {
  return ctx.arrangement.map((section) => {
    const rng = ctx.fork(`${roleName}:${section.name}`);
    const notes = renderSection(section, rng);
    const description = describeSection ? describeSection(section) : undefined;
    return makeClip(section, `${ctx.recipe.label} ${roleName} - ${section.name}`, notes, description);
  });
}

export function sectionIntensity(ctx, section) {
  return Math.max(0.25, section.energy * ctx.energyFactor * ctx.densityFactor);
}

export function progressionDegree(progression, bar) {
  return progression[bar % progression.length];
}

export function pickProgression(ctx, progressions) {
  return ctx.fork("progression").pick(progressions);
}
