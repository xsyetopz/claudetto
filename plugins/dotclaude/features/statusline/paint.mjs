// The look that every segment shares: one icon set (`ICON`), one color scale for percent
// (green, yellow at the first `USAGE_LEVELS` value, red at the second), one meter bar,
// and a warning glyph that blinks from the clock that the caller passes.
// There is no emoji, because an emoji takes two columns in some terminals and one in others,
// and the row packing counts columns.
// `NO_COLOR` removes the colors and keeps the icons, the bars, and the links.

import { USAGE_LEVELS } from "../../lib/budget.mjs";

export const ICON = {
  warn: "◬",
  model: "◆",
  thinking: "∴",
  context: "◧",
  headroom: "⇥",
  warm: "◷",
  cold: "◌",
  miss: "✘",
  deficit: "▲",
  reserve: "▼",
  runout: "⏵",
  reset: "↻",
  credit: "⟳",
  cost: "$",
  lines: "Δ",
  folder: "▣",
  repo: "⌂",
  branch: "⎇",
  worktree: "⊞",
  dirty: "±",
  ahead: "↑",
  behind: "↓",
  pr: "⇄",
  agent: "@",
  style: "✎",
  vim: "Ⓥ",
  spec: "▤",
  done: "✓",
  system: "⊛",
  memory: "☰",
  skills: "✦",
  messages: "❝",
  free: "◇",
  fable: "✧",
};

const paint = (code) => (text) =>
  !text || process.env.NO_COLOR ? text : `\x1b[${code}m${text}\x1b[0m`;
export const C = {
  dim: paint("2"),
  bold: paint("1"),
  red: paint("31"),
  green: paint("32"),
  yellow: paint("33"),
  blue: paint("34"),
  magenta: paint("35"),
  cyan: paint("36"),
};
/** The dim separator between segments. It is a function, because `NO_COLOR` can change after the import. */
export const sep = () => C.dim(" · ");

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
// A color code, or an OSC 8 link start or end.
const CODES = new RegExp(`${ESC}\\[[0-9;]*m|${ESC}\\]8;;[^${BEL}]*${BEL}`, "g");

/** Visible width: colors and links take no columns. */
export const width = (text) => [...text.replace(CODES, "")].length;

/** The one color scale for a percent that grows toward a limit. */
export function levelColor(pct) {
  if (pct >= USAGE_LEVELS[1]) return C.red;
  return pct >= USAGE_LEVELS[0] ? C.yellow : C.green;
}

/** True in the "on" half of each second. `now` is in milliseconds. */
export const blinkOn = (now) => Math.floor(now / 1000) % 2 === 0;

/**
 * A warning glyph that blinks red and dim while `urgent`.
 * A dim dot, not a space, shows when off, so that no gap opens after a separator.
 * With `NO_COLOR` the glyph and the dot alternate.
 */
export function alarm(urgent, now) {
  if (!urgent) return "";
  if (process.env.NO_COLOR) return `${blinkOn(now) ? ICON.warn : "·"} `;
  return `${blinkOn(now) ? C.red(ICON.warn) : C.dim(ICON.warn)} `;
}

/** The one bar: five cells, filled by `pct`, colored by the scale. */
export function bar(pct, cells = 5) {
  const full = Math.round((Math.min(Math.max(pct, 0), 100) / 100) * cells);
  return `${levelColor(pct)("█".repeat(full))}${C.dim("░".repeat(cells - full))}`;
}

/** The one meter shape: `icon bar number`, colored by the scale. */
export const meter = (label, pct, text) =>
  `${label} ${bar(pct)} ${levelColor(pct)(text)}`;

/** `text` as an OSC 8 link to `url`, or the plain text when there is no URL. */
export const link = (url, text) =>
  url ? `\x1b]8;;${url}\x07${text}\x1b]8;;\x07` : text;
