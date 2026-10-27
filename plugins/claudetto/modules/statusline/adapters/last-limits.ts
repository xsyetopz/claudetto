// The last reading of each limit window, in the `claudetto` folder of the config folder, so it outlives a reboot.
// Claude Code can leave a window out, so its last reading shows until its `resets_at` passes. A window with no `resets_at` has no known end, so its reading never shows.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isExpected } from "../../../kernel/errors.ts";
import { failureText } from "../../../kernel/node/hook-io.ts";
import { parseJson } from "../../../kernel/text.ts";
import type { LimitWindow } from "../format.ts";
import { READING_KEEP_MS } from "../limits.ts";
import type { Limits, StatusInput } from "../types.ts";
import type { Deps } from "./cli.ts";

/** The limits file in the `claudetto` folder of the config folder `configDir`. A session with another config folder, such as another account, reads another file. */
export const limitsFile = (configDir: string): string =>
	path.join(configDir, "claudetto", "limits.json");

/** True when `file` is a link, false when it is missing. */
const isLink = async (file: string): Promise<boolean> => {
	try {
		return (await fs.lstat(file)).isSymbolicLink();
	} catch (err) {
		if (isExpected(err, "ENOENT")) {
			return false;
		}
		throw err;
	}
};

/**
 * The limits file of `configDir` when its folder is safe to use, or `undefined`, so the status line skips the file with no error:
 * `configDir` is absolute, the `claudetto` folder is made, and it is a folder with owner `uid` and no link, and `limits.json` is no link.
 */
export const safeLimitsFile = async (
	configDir: string,
	uid: number = os.userInfo().uid,
): Promise<string | undefined> => {
	if (!path.isAbsolute(configDir)) {
		return undefined;
	}
	const file = limitsFile(configDir);
	const folder = path.dirname(file);
	try {
		await fs.mkdir(folder, { recursive: true });
		const stat = await fs.lstat(folder);
		if (!stat.isDirectory() || stat.uid !== uid) {
			return undefined;
		}
		if (await isLink(file)) {
			return undefined;
		}
	} catch {
		return undefined;
	}
	return file;
};

const KEYS = ["five_hour", "seven_day", "spend_limit"] as const;

interface Reading {
	at: number;
	window: LimitWindow;
}

type LimitPorts = Pick<Deps, "files" | "write" | "now">;

const isReading = (v: unknown): v is Reading => {
	if (typeof v !== "object" || v === null) {
		return false;
	}
	const window = Reflect.get(v, "window");
	return (
		typeof Reflect.get(v, "at") === "number" &&
		typeof window === "object" &&
		window !== null &&
		typeof Reflect.get(window, "resets_at") === "number"
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
	if (file === undefined) {
		return { limits: current, ages: {} };
	}
	const now = ports.now();
	const text = await ports.files.read(file).catch((err) => {
		onError(failureText(err));
	});
	const saved = parseJson(text ?? "");
	const savedAt = (key: string): unknown =>
		typeof saved === "object" && saved !== null
			? Reflect.get(saved, key)
			: undefined;
	const limits: Limits = { ...current };
	const ages: Partial<Record<keyof Limits, number>> = {};
	const next: Partial<Record<keyof Limits, Reading>> = {};
	for (const key of KEYS) {
		const window = current[key];
		const last = savedAt(key);
		// A window with no `resets_at` is not saved, because its reading never shows.
		if (window && typeof window.resets_at !== "number") {
			continue;
		}
		if (window) {
			next[key] = kept(last, window, now) ?? { at: now, window };
		} else if (
			isReading(last) &&
			last.at <= now &&
			typeof last.window.resets_at === "number" &&
			last.window.resets_at * 1000 > now
		) {
			limits[key] = last.window;
			ages[key] = now - last.at;
			next[key] = last;
		}
	}
	const out = `${JSON.stringify(next)}\n`;
	if (out !== text) {
		await ports.write(file, out).catch((err) => onError(failureText(err)));
	}
	return { limits, ages };
};
