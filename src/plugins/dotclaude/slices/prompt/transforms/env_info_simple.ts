import { applyParts, type Part } from "./parts.ts";

export const PARTS: readonly Part[] = [
  {
    anchor: /^ - The most recent Claude models.*$/gm,
    text: " - Model IDs: Fable 5.1 `claude-fable-5-1`, Opus 5.5 `claude-opus-5-5`, Sonnet 5.5 `claude-sonnet-5-5`, Haiku 5.5 `claude-haiku-5-5`. Use the latest and most capable model for an AI application.",
  },
  {
    anchor: /^ - Claude Code is available as a CLI.*$/gm,
    text: " - Claude Code runs as a CLI, a desktop app, a web app, and IDE extensions.",
  },
  {
    // The `trim` slice turns fast mode off, so the line about `/fast` goes, with the line break before it.
    // The line is the last line of the section, so no line break follows it.
    anchor: /(?:\n|^) - Fast mode for Claude Code.*$/gm,
    text: "",
  },
];

export const transform = (text: string): string => applyParts(text, PARTS);
