// Plain text formats for model names and times. No colors here.

import { parseModel } from "../../lib/model.ts";

/** "claude-opus-5-5" -> "Opus 5.5", "claude-haiku-4-5-20251001" -> "Haiku 4.5". */
export function shortModel(id: string | undefined): string {
  const m = parseModel(id);
  if (!m) return String(id ?? "");
  const name = `${(m.family[0] as string).toUpperCase()}${m.family.slice(1)}`;
  return `${name} ${m.minor === null ? m.major : `${m.major}.${m.minor}`}`;
}

/** Time left, rounded up: "4m", "1h5m", "3d". */
export const countdown = (sec: number): string => {
  const min = Math.ceil(sec / 60);
  if (min >= 1440) return `${Math.floor(min / 1440)}d`;
  return min >= 60 ? `${Math.floor(min / 60)}h${min % 60}m` : `${min}m`;
};

/** Elapsed minutes: "4m", "1h5m". */
export const minutes = (ms: number): string =>
  countdown(Math.floor(ms / 60_000) * 60);

/**
 * A time in Claude Code's own `/usage` format: "3pm" or "3:30pm" within a
 * day, else "Oct 5 at 3pm", with the year when it differs from now.
 */
export function clock(sec: number, now: number): string {
  const d = new Date(sec * 1000);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: d.getMinutes() === 0 ? undefined : "2-digit",
    hour12: true,
  };
  const time = d
    .toLocaleTimeString("en-US", opts)
    .replace(/[  ]([AP]M)/i, (_, m) => m.toLowerCase());
  if (sec * 1000 - now <= 24 * 3600_000) return time;
  // The date and the time are formatted apart, because ICU versions join
  // them with " at " or with ", ".
  const date: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (d.getFullYear() !== new Date(now).getFullYear()) date.year = "numeric";
  return `${d.toLocaleDateString("en-US", date)} at ${time}`;
}
