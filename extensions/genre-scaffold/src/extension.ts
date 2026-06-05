import {
  initialize,
  type ActivationContext,
  type ArrangementSelection,
  type ExtensionContext
} from "@ableton-extensions/sdk";
import fs from "node:fs";
import path from "node:path";
import {
  clearGeneratedScaffold,
  hasGeneratedScaffoldContent,
  renderGenreScaffold,
  type ScaffoldOptions
} from "./adapter/liveAdapter.js";
import optionsDialog from "./ui/options.html";

const GENERATE_COMMAND_ID = "genreScaffold.generate";
const CLEAR_COMMAND_ID = "genreScaffold.clear";
type Api = ExtensionContext<"1.0.0">;
const GENERATE_MENU_LABEL = "Generate Genre Scaffold";
const CLEAR_MENU_LABEL = "Clear Genre Scaffold";
const GENERATE_MENU_SCOPES = [
  "MidiTrack",
  "MidiTrack.ArrangementSelection",
  "MidiClip",
  "ClipSlot",
  "ClipSlotSelection"
] as const;
const CLEAR_MENU_SCOPES = [
  "AudioClip",
  "AudioTrack",
  "AudioTrack.ArrangementSelection",
  "MidiClip",
  "MidiTrack",
  "MidiTrack.ArrangementSelection",
  "ClipSlot",
  "ClipSlotSelection"
] as const;

type BeatRange = {
  start: number;
  end: number;
};

type Preferences = {
  skipReplaceConfirm?: boolean;
};

let memoryPreferences: Preferences = {};

function dialogUrl() {
  return `data:text/html,${encodeURIComponent(optionsDialog)}`;
}

function confirmDialogUrl(title: string, body: string, showDontAskAgain: boolean) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script>
    const isWebKitMessageHandlerAvailable = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.live;
    const isWebView2 = window.chrome && window.chrome.webview;
    function sendMessage(message) {
      if (isWebKitMessageHandlerAvailable) {
        window.webkit.messageHandlers.live.postMessage(message);
      } else if (isWebView2) {
        window.chrome.webview.postMessage(message);
      } else {
        document.documentElement.dataset.lastMessage = JSON.stringify(message);
      }
    }
    function closeWithResult(result) {
      sendMessage({ method: "close_and_send", params: [JSON.stringify(result)] });
    }
    function confirmAction() {
      const checkbox = document.getElementById("dontAskAgain");
      closeWithResult({ confirmed: true, dontAskAgain: Boolean(checkbox && checkbox.checked) });
    }
    function cancelAction() {
      closeWithResult({ confirmed: false });
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") cancelAction();
      if (event.key === "Enter" && event.metaKey) confirmAction();
    });
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    * { margin: 0; }
    input, button { font: inherit; }
    html {
      height: 100%;
      background: hsl(0, 0%, 21%);
      color: hsl(0, 0%, 74%);
      font-family: "AbletonSansSmall", Arial, sans-serif;
      font-size: 12px;
      font-weight: 500;
    }
    body {
      min-height: 100%;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    h1 {
      color: hsl(0, 0%, 84%);
      font-size: 15px;
      font-weight: 700;
    }
    p {
      line-height: 1.4;
    }
    label {
      display: ${showDontAskAgain ? "flex" : "none"};
      align-items: center;
      gap: 7px;
      color: hsl(0, 0%, 62%);
    }
    footer {
      margin-top: auto;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      border-top: 1px solid hsl(0, 0%, 8%);
      padding-top: 10px;
    }
    button {
      height: 24px;
      color: hsl(0, 0%, 74%);
      background: hsl(0, 0%, 16%);
      border: 1px solid hsl(0, 0%, 8%);
      border-radius: 3px;
      padding: 0 10px;
      cursor: pointer;
    }
    .primary {
      background: hsl(31, 100%, 67%);
      color: hsl(0, 0%, 7%);
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${body}</p>
  <label><input id="dontAskAgain" type="checkbox">Don't ask again for generated-selection replacement</label>
  <footer>
    <button type="button" onclick="cancelAction()">Cancel</button>
    <button class="primary" type="button" onclick="confirmAction()">Continue</button>
  </footer>
</body>
</html>`;
  return `data:text/html,${encodeURIComponent(html)}`;
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

function selectionRangeFromArgument(arg: unknown): BeatRange | undefined {
  if (arg && typeof arg === "object" && "time_selection_start" in arg) {
    const selection = arg as ArrangementSelection;
    const start = Math.max(0, Number(selection.time_selection_start));
    const end = Math.max(start, Number(selection.time_selection_end));
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return { start, end };
    }
  }

  return undefined;
}

function baseBeatFromArgument(arg: unknown) {
  return selectionRangeFromArgument(arg)?.start ?? 0;
}

function preferencesPath(api: Api) {
  const storageDirectory = api.environment.storageDirectory;
  return storageDirectory ? path.join(storageDirectory, "genre-scaffold-preferences.json") : undefined;
}

function readPreferences(api: Api): Preferences {
  const filePath = preferencesPath(api);
  if (!filePath) {
    return memoryPreferences;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Preferences;
  } catch {
    return memoryPreferences;
  }
}

function writePreferences(api: Api, preferences: Preferences) {
  memoryPreferences = preferences;
  const filePath = preferencesPath(api);
  if (!filePath) {
    return;
  }

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(preferences, null, 2));
  } catch (error) {
    console.warn("Could not write Genre Scaffold preferences.", error);
  }
}

async function confirmAction(
  api: Api,
  title: string,
  body: string,
  showDontAskAgain = false
) {
  const result = await api.ui.showModalDialog(confirmDialogUrl(title, body, showDontAskAgain), 430, showDontAskAgain ? 230 : 205);
  try {
    return JSON.parse(result) as { confirmed?: boolean; dontAskAgain?: boolean };
  } catch {
    return { confirmed: false };
  }
}

async function clearBeforeReplaceIfNeeded(api: Api, range: BeatRange | undefined) {
  if (!range || !hasGeneratedScaffoldContent(api, range)) {
    return true;
  }

  const preferences = readPreferences(api);
  if (!preferences.skipReplaceConfirm) {
    const confirmation = await confirmAction(
      api,
      "Replace Generated Section?",
      "This selection already contains Genre Scaffold material. Continue to clear generated clips and markers in the selected range, then write the new scaffold there.",
      true
    );
    if (!confirmation.confirmed) {
      return false;
    }
    if (confirmation.dontAskAgain) {
      writePreferences(api, { ...preferences, skipReplaceConfirm: true });
    }
  }

  await clearGeneratedScaffold(api, range);
  return true;
}

export function activate(activation: ActivationContext) {
  const api: Api = initialize(activation, "1.0.0");
  console.log("Genre Scaffold activated.");

  api.commands.registerCommand(GENERATE_COMMAND_ID, (arg: unknown) => {
    void (async () => {
      const result = await api.ui.showModalDialog(dialogUrl(), 520, 520);
      const options = parseOptions(result);
      if (!options) {
        return;
      }
      const range = selectionRangeFromArgument(arg);
      if (!(await clearBeforeReplaceIfNeeded(api, range))) {
        return;
      }
      await renderGenreScaffold(api, options, baseBeatFromArgument(arg));
    })().catch((error) => {
      console.error("Genre Scaffold failed", error);
    });
  });

  api.commands.registerCommand(CLEAR_COMMAND_ID, (arg: unknown) => {
    void (async () => {
      const range = selectionRangeFromArgument(arg);
      if (!hasGeneratedScaffoldContent(api, range)) {
        console.info("No Genre Scaffold material found to clear.");
        return;
      }
      const confirmation = await confirmAction(
        api,
        range ? "Clear Generated Selection?" : "Clear Generated Scaffold?",
        range
          ? "This removes Genre Scaffold clips and markers in the selected range. Generated tracks with no material outside the selection will be removed."
          : "This removes generated Genre Scaffold tracks and markers from the current Live Set."
      );
      if (!confirmation.confirmed) {
        return;
      }
      await clearGeneratedScaffold(api, range);
    })().catch((error) => {
      console.error("Genre Scaffold clear failed", error);
    });
  });

  for (const scope of GENERATE_MENU_SCOPES) {
    void api.ui.registerContextMenuAction(scope, GENERATE_MENU_LABEL, GENERATE_COMMAND_ID);
  }

  for (const scope of CLEAR_MENU_SCOPES) {
    void api.ui.registerContextMenuAction(scope, CLEAR_MENU_LABEL, CLEAR_COMMAND_ID);
  }
}
