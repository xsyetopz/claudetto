// Behavior of the JSON reads of `claudetto-sandbox`: an absent file and text that is not JSON are expected,
// and any other read error is thrown.
// Each test works in its own folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  parseJson,
  readJson,
} from "../../../plugins/claudetto-lab/slices/sandbox/adapters/json.ts";
import { availableModels } from "../../../plugins/claudetto-lab/slices/sandbox/adapters/setup.ts";
import { tmpDir } from "../../support/repo.ts";

const folder = () => tmpDir("lab-json");

test("text that is not JSON gives null", () => {
  expect(parseJson("{not json")).toBe(null);
  expect(parseJson('{"a":1}')).toStrictEqual({ a: 1 });
});

test("an absent file and a path under a file give null", async () => {
  const dir = folder();
  await Bun.write(path.join(dir, "plain"), "x");
  expect(await readJson(path.join(dir, "none.json"))).toBe(null);
  expect(await readJson(path.join(dir, "plain", "inner.json"))).toBe(null);
});

test("a file with damaged JSON gives null", async () => {
  const dir = folder();
  await Bun.write(path.join(dir, "bad.json"), "{");
  expect(await readJson(path.join(dir, "bad.json"))).toBe(null);
});

test("a read error other than an absent file is thrown", async () => {
  const dir = folder();
  fs.mkdirSync(path.join(dir, "folder.json"));
  await expect(readJson(path.join(dir, "folder.json"))).rejects.toMatchObject({
    code: "EISDIR",
  });
});

test("`availableModels` reads the list, and gives undefined when the settings are absent", async () => {
  const dir = folder();
  expect(await availableModels(dir)).toBe(undefined);
  await Bun.write(
    path.join(dir, "settings.json"),
    JSON.stringify({ availableModels: ["claude-a"] }),
  );
  expect(await availableModels(dir)).toStrictEqual(["claude-a"]);
});

test("`which` skips a folder of `PATH` that is absent and finds a program in a later folder", async () => {
  const dir = folder();
  const program = path.join(dir, "tool-x");
  await Bun.write(program, "#!/bin/sh\n");
  fs.chmodSync(program, 0o755);
  const PATH = [path.join(dir, "missing"), dir].join(path.delimiter);
  expect(Bun.which("tool-x", { PATH })).toBe(program);
  expect(Bun.which("tool-y", { PATH })).toBe(null);
});
