// Reads of JSON files of the sandbox.
// A file that is absent, or text that is not JSON, gives `null`, and any other error is thrown.

import fs from "node:fs";

/** The parsed JSON of `text`, or `null` when `text` is not JSON. */
export function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    return null;
  }
}

/** The text of `file`, or `null` when the file or its folder is absent. */
export function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (err) {
    if (err?.code !== "ENOENT" && err?.code !== "ENOTDIR") throw err;
    return null;
  }
}

/** The parsed JSON in `file`, or `null` when the file is absent or is not JSON. */
export function readJson(file) {
  const text = readText(file);
  return text === null ? null : parseJson(text);
}
