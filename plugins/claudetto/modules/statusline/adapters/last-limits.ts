// The last reading of each limit window, in the cache folder of `git-cache.ts`.
// Claude Code can leave a window out, so its last reading shows until its `resets_at` passes. A window with no `resets_at` has no known end, so its reading never shows.
import path from "node:path";
import { failureText } from "../../../kernel/node/hook-io.ts";
import { parseJson } from "../../../kernel/text.ts";
import type { LimitWindow } from "../format.ts";
import { READING_KEEP_MS } from "../limits.ts";
import type { Limits, StatusInput } from "../types.ts";
import type { Deps } from "./cli.ts";

/** The limits file of the config folder `configDir` in the cache folder `folder`. Each config folder can be another account, so it has its own file. */
export const limitsFile = (
  folder: string | undefined,
  configDir = "",
): string | undefined => {
  if (folder === undefined) return undefined;
  const key = new Bun.CryptoHasher("sha256").update(configDir).digest("hex");
  return path.join(folder, `claudetto-limits-${key.slice(0, 16)}.json`);
};

const KEYS = ["five_hour", "seven_day", "spend_limit"] as const;

type Reading = { at: number; window: LimitWindow };

type LimitPorts = Pick<Deps, "files" | "write" | "now">;

const isReading = (v: unknown): v is Reading => {
  const r = v as Reading | undefined;
  return (
    typeof r?.at === "number" &&
    typeof r.window === "object" &&
    r.window !== null &&
    typeof r.window.resets_at === "number"
  );
};

/** The saved reading `last` when it has the same `window`, is not in the future, and is younger than `READING_KEEP_MS`. */
const kept = (
  last: unknown,
  window: LimitWindow,
  now: number,
): Reading | undefined =>
  isReading(last) &&
  last.at <= now &&
  now - last.at < READING_KEEP_MS &&
  JSON.stringify(last.window) === JSON.stringify(window)
    ? last
    : undefined;

/**
 * The windows of `input`, and each missing window from its last reading while its `resets_at` has not passed, with the age in milliseconds of each such reading in `ages`.
 * Each window of the input with a `resets_at` is saved as a reading at `now` in `file`. With no `file`, nothing is read or written. A failed read or write goes to `onError`.
 */
export const withLastLimits = async (
  input: StatusInput,
  ports: LimitPorts,
  onError: (text: string) => void,
  file: string | undefined,
): Promise<{ limits: Limits; ages: Partial<Record<keyof Limits, number>> }> => {
  const current = input.rate_limits ?? {};
  if (file === undefined) return { limits: current, ages: {} };
  const now = ports.now();
  const text = await ports.files.read(file).catch((err) => {
    onError(failureText(err));
    return undefined;
  });
  const saved = (parseJson(text ?? "") ?? {}) as Record<string, unknown>;
  const limits: Limits = { ...current };
  const ages: Partial<Record<keyof Limits, number>> = {};
  const next: Partial<Record<keyof Limits, Reading>> = {};
  for (const key of KEYS) {
    const window = current[key];
    const last = saved[key];
    // A window with no `resets_at` is not saved, because its reading never shows.
    if (window && typeof window.resets_at !== "number") continue;
    if (window) next[key] = kept(last, window, now) ?? { at: now, window };
    else if (
      isReading(last) &&
      last.at <= now &&
      (last.window.resets_at as number) * 1000 > now
    ) {
      limits[key] = last.window;
      ages[key] = now - last.at;
      next[key] = last;
    }
  }
  const out = `${JSON.stringify(next)}\n`;
  if (out !== text)
    await ports.write(file, out).catch((err) => onError(failureText(err)));
  return { limits, ages };
};
