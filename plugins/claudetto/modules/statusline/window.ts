// The context window in effect. Claude Code takes `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, then `autoCompactWindow` in `modelSettings.<model>`, then the top-level `autoCompactWindow`, and the window of the model when none is set. No import of an adapter.
import { COMPACT_WINDOW_MAX, COMPACT_WINDOW_MIN } from "./limits.ts";

/** The settings objects of the user, the project, and the local project file, and the env var. */
export type WindowSources = {
  env: string | undefined;
  /** In the order of precedence: local, project, user. A file that is missing or not valid is left out. */
  settings: readonly unknown[];
};

/** A window: `"auto"` is the window of the model, and a number out of range, or any other type, is not a value. */
type Setting = number | "auto" | undefined;

const settingOf = (value: unknown): Setting => {
  const n = typeof value === "string" ? Number(value) : value;
  if (value === "auto") return "auto";
  return typeof n === "number" &&
    Number.isInteger(n) &&
    n >= COMPACT_WINDOW_MIN &&
    n <= COMPACT_WINDOW_MAX
    ? n
    : undefined;
};

const fieldOf = (object: unknown, key: string): unknown =>
  object !== null && typeof object === "object"
    ? (object as Record<string, unknown>)[key]
    : undefined;

/** The window that the env var or the settings give for `model`, or `undefined` for the window of the model. */
const configuredWindow = (
  { env, settings }: WindowSources,
  model: string | undefined,
): number | undefined => {
  const fromModel = settings.map((file) =>
    settingOf(
      fieldOf(
        fieldOf(fieldOf(file, "modelSettings"), model ?? ""),
        "autoCompactWindow",
      ),
    ),
  );
  const fromTop = settings.map((file) =>
    settingOf(fieldOf(file, "autoCompactWindow")),
  );
  const found = [settingOf(env), ...fromModel, ...fromTop].find(
    (value) => value !== undefined,
  );
  return found === "auto" ? undefined : found;
};

/** The smaller of the configured window and `size` (the window that Claude Code reports), or `size` when none is set. */
export const windowInEffect = (
  sources: WindowSources,
  model: string | undefined,
  size: number | undefined,
): number | undefined => {
  const configured = configuredWindow(sources, model);
  const reported =
    typeof size === "number" && Number.isFinite(size) && size > 0
      ? size
      : undefined;
  if (configured === undefined) return reported;
  return reported === undefined ? configured : Math.min(configured, reported);
};

/** No window is set: the window of the model stays. */
export const NO_WINDOWS: WindowSources = { env: undefined, settings: [] };
