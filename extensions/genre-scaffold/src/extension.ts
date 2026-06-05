import {
  initialize,
  type ActivationContext,
  type ArrangementSelection,
  type ExtensionContext
} from "@ableton-extensions/sdk";
import { renderGenreScaffold, type ScaffoldOptions } from "./adapter/liveAdapter.js";
import optionsDialog from "./ui/options.html";

const COMMAND_ID = "genreScaffold.generate";
type Api = ExtensionContext<"1.0.0">;

function dialogUrl() {
  return `data:text/html,${encodeURIComponent(optionsDialog)}`;
}

function parseOptions(result: string): ScaffoldOptions | null {
  const parsed = JSON.parse(result) as Partial<ScaffoldOptions> & { cancelled?: boolean; useDefaultTempo?: boolean };
  if (parsed.cancelled) {
    return null;
  }

  return {
    genre: String(parsed.genre ?? "old-skool-house"),
    key: String(parsed.key ?? "C minor"),
    bars: Number(parsed.bars ?? 16),
    density: (parsed.density ?? "balanced") as ScaffoldOptions["density"],
    energy: (parsed.energy ?? "medium") as ScaffoldOptions["energy"],
    seed: String(parsed.seed || Date.now()),
    ...(parsed.useDefaultTempo ? {} : { tempo: Number(parsed.tempo || 0) || undefined })
  };
}

function baseBeatFromArgument(arg: unknown) {
  if (arg && typeof arg === "object" && "time_selection_start" in arg) {
    const selection = arg as ArrangementSelection;
    return Math.max(0, selection.time_selection_start);
  }

  return 0;
}

export function activate(activation: ActivationContext) {
  const api: Api = initialize(activation, "1.0.0");

  api.commands.registerCommand(COMMAND_ID, (arg: unknown) => {
    void (async () => {
      const result = await api.ui.showModalDialog(dialogUrl(), 520, 520);
      const options = parseOptions(result);
      if (!options) {
        return;
      }
      await renderGenreScaffold(api, options, baseBeatFromArgument(arg));
    })().catch((error) => {
      console.error("Genre Scaffold failed", error);
    });
  });

  api.ui.registerContextMenuAction("MidiTrack", "Generate Genre Scaffold", COMMAND_ID);
  api.ui.registerContextMenuAction("MidiTrack.ArrangementSelection", "Generate Genre Scaffold", COMMAND_ID);
}
