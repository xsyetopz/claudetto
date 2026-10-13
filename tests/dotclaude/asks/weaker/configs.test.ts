// The ask on a weaker lint config or check runner config (package P36): a call asks only when it switches a check off or lowers it.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { editAsks, writeAsks } from "../calls.ts";

const BIOME = "/w/biome.json";
const BIOME_SRC = `{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "linter": {
    "rules": {
      "suspicious": { "noExplicitAny": "error", "noDebugger": "warn" }
    }
  },
  "files": { "ignore": ["dist"] }
}
`;

test("a lint rule that goes off or to a lower level gets an ask", async () => {
  expect(
    await editAsks(
      BIOME,
      BIOME_SRC,
      '"noExplicitAny": "error"',
      '"noExplicitAny": "off"',
    ),
  ).toBe(true);
  expect(
    await editAsks(
      BIOME,
      BIOME_SRC,
      '"noExplicitAny": "error"',
      '"noExplicitAny": "warn"',
    ),
  ).toBe(true);
});

test("an added ignore entry and a removed rule get an ask", async () => {
  expect(
    await editAsks(BIOME, BIOME_SRC, '["dist"]', '["dist", "tests"]'),
  ).toBe(true);
  expect(await editAsks(BIOME, BIOME_SRC, ', "noDebugger": "warn"', "")).toBe(
    true,
  );
  expect(
    await editAsks(
      BIOME,
      BIOME_SRC,
      '"files": { "ignore": ["dist"] }',
      '"files": { "ignore": ["dist"], "includes": ["src"], "experimentalScannerIgnores": ["x"] }',
    ),
  ).toBe(true);
});

test("a lint config with a comment and a trailing comma is read as JSON", async () => {
  const jsonc = "/w/biome.jsonc";
  const text = '{\n  // The rules.\n  "rules": { "a": "error", },\n}\n';
  expect(await editAsks(jsonc, text, '"a": "error"', '"a": "off"')).toBe(true);
  expect(
    await editAsks(jsonc, text, '"a": "error"', '"a": "error", "b": "error"'),
  ).toBe(false);
});

test("a lower coverage threshold in a runner config gets an ask", async () => {
  const file = "/w/vitest.config.ts";
  const text =
    "export default {\n  test: {\n    coverage: {\n      lines: 90,\n    },\n  },\n};\n";
  expect(await editAsks(file, text, "lines: 90", "lines: 70")).toBe(true);
  expect(await editAsks(file, text, "      lines: 90,\n", "")).toBe(true);
  expect(
    await editAsks(
      file,
      text,
      "lines: 90,",
      "lines: 90,\n      exclude: ['src/a.ts'],",
    ),
  ).toBe(true);
});

test("a lint rule in a TOML config that goes off or is added to an ignore list gets an ask", async () => {
  const toml = "/w/ruff.toml";
  const text = '[lint]\nselect = ["E", "F"]\nignore = ["E501"]\n';
  expect(await editAsks(toml, text, '["E501"]', '["E501", "F401"]')).toBe(true);
  expect(await editAsks(toml, text, '["E", "F"]', '["E"]')).toBe(true);
  expect(
    await editAsks(
      "/w/pyproject.toml",
      "[tool.ruff]\nline-length = 88\n[tool.other]\nx = 1\n",
      "line-length = 88\n",
      "",
    ),
  ).toBe(true);
});

test("a section of `pyproject.toml` that is not a tool config gets no ask", async () => {
  const text = '[project]\nname = "a"\n[tool.ruff]\nline-length = 88\n';
  expect(
    await editAsks("/w/pyproject.toml", text, 'name = "a"', 'name = "b"'),
  ).toBe(false);
});

test("a rule that is added or made stricter gets no ask", async () => {
  expect(
    await editAsks(
      BIOME,
      BIOME_SRC,
      '"noDebugger": "warn"',
      '"noDebugger": "error"',
    ),
  ).toBe(false);
  expect(
    await editAsks(
      BIOME,
      BIOME_SRC,
      '"noDebugger": "warn"',
      '"noDebugger": "warn", "noConsole": "error"',
    ),
  ).toBe(false);
  expect(await editAsks(BIOME, BIOME_SRC, '["dist"]', "[]")).toBe(false);
  const file = "/w/vitest.config.ts";
  const text =
    "export default {\n  test: {\n    coverage: {\n      lines: 90,\n    },\n  },\n};\n";
  expect(await editAsks(file, text, "lines: 90", "lines: 95")).toBe(false);
  expect(
    await editAsks(file, text, "lines: 90,", "lines: 90,\n      branches: 80,"),
  ).toBe(false);
});

test("a format change and a move of a config get no ask", async () => {
  const wide = BIOME_SRC.replace(
    '{ "noExplicitAny": "error", "noDebugger": "warn" }',
    '{\n        "noDebugger": "warn",\n        "noExplicitAny": "error"\n      }',
  );
  expect(await writeAsks(BIOME, BIOME_SRC, wide)).toBe(false);
  const toml = "/w/ruff.toml";
  expect(
    await editAsks(
      toml,
      '[lint]\nselect = ["E"]\n',
      '[lint]\nselect = ["E"]',
      '# Rules.\n[lint]\nselect = [ "E" ]',
    ),
  ).toBe(false);
});

test("a new config file gets no ask", async () => {
  expect(await writeAsks("/w/pkg/biome.json", "", BIOME_SRC)).toBe(false);
});
