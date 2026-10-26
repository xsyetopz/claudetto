import {
  FEWER_PLUGINS_LOADED,
  NO_PLUGIN_LOADED,
  NO_UNKNOWN_FIELD,
  UNKNOWN_FIELD_COUNT,
} from "../prompts.ts";

export const pluginLoaded = (text: string): boolean =>
  /Loaded inline plugin from path:/.test(text);

/** The count of plugins that the log shows as loaded from a `--plugin-dir`. */
export const loadedCount = (text: string): number =>
  (text.match(/Loaded inline plugin from path:/g) ?? []).length;

/** `expected` is the count of `--plugin-dir` arguments: a log with fewer loaded plugins ran another arm. */
export const report = (
  log: string,
  text: string,
  expected = 1,
): { lines: string[]; code: number } => {
  const hits = text
    .split("\n")
    .filter((l) =>
      /unknown (?:frontmatter )?field|unrecognized field/i.test(l),
    );
  const count = loadedCount(text);
  const loaded = pluginLoaded(text) && count >= expected;
  return {
    lines: [
      `Debug log: ${log} (${text.split("\n").length} lines)`,
      ...hits,
      ...(pluginLoaded(text) ? [] : [NO_PLUGIN_LOADED]),
      ...(pluginLoaded(text) && !loaded
        ? [
            FEWER_PLUGINS_LOADED({
              loaded: String(count),
              expected: String(expected),
            }),
          ]
        : []),
      hits.length === 0
        ? NO_UNKNOWN_FIELD
        : UNKNOWN_FIELD_COUNT({ count: String(hits.length) }),
    ],
    code: hits.length === 0 && loaded ? 0 : 1,
  };
};
