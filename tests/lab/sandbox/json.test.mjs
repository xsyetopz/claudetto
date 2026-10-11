// Behavior of the JSON reads of `dotclaude-sandbox`: an absent file and text that is not JSON are expected,
// and any other read error is thrown.
// Each test works in its own folder under `TMPDIR`.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  parseJson,
  readJson,
} from "../../../plugins/dotclaude-lab/features/sandbox/json.mjs";
import {
  availableModels,
  which,
} from "../../../plugins/dotclaude-lab/features/sandbox/setup.mjs";
import { tmpDir } from "../../support/repo.mjs";

const folder = () => tmpDir("lab-json");

test("text that is not JSON gives null", () => {
  assert.equal(parseJson("{not json"), null);
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
});

test("an absent file and a path under a file give null", () => {
  const dir = folder();
  fs.writeFileSync(path.join(dir, "plain"), "x");
  assert.equal(readJson(path.join(dir, "none.json")), null);
  assert.equal(readJson(path.join(dir, "plain", "inner.json")), null);
});

test("a file with damaged JSON gives null", () => {
  const dir = folder();
  fs.writeFileSync(path.join(dir, "bad.json"), "{");
  assert.equal(readJson(path.join(dir, "bad.json")), null);
});

test("a read error other than an absent file is thrown", () => {
  const dir = folder();
  fs.mkdirSync(path.join(dir, "folder.json"));
  assert.throws(() => readJson(path.join(dir, "folder.json")), {
    code: "EISDIR",
  });
});

test("`availableModels` reads the list, and gives undefined when the settings are absent", () => {
  const dir = folder();
  assert.equal(availableModels(dir), undefined);
  fs.writeFileSync(
    path.join(dir, "settings.json"),
    JSON.stringify({ availableModels: ["claude-a"] }),
  );
  assert.deepEqual(availableModels(dir), ["claude-a"]);
});

test("`which` skips a folder of `PATH` that is absent and finds a program in a later folder", () => {
  const dir = folder();
  // Windows runs a program with an extension from `PATHEXT`, and `which` tries each one.
  const ext =
    process.platform === "win32"
      ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";")[0]
      : "";
  const program = path.join(dir, `tool-x${ext}`);
  fs.writeFileSync(program, "#!/bin/sh\n", { mode: 0o755 });
  const saved = process.env.PATH;
  process.env.PATH = [path.join(dir, "missing"), dir].join(path.delimiter);
  try {
    assert.equal(which("tool-x"), program);
    assert.equal(which("tool-y"), undefined);
  } finally {
    process.env.PATH = saved;
  }
});
