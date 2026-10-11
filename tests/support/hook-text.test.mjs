// Behavior of `tools/hook-text.mjs`: each `hooks.json` holds the texts of its text files,
// and a prompt file needs exactly one `prompt` hook on its event.
// Each test that writes files works in its own folder under `TMPDIR`.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { format, hookDirs, withTexts } from "../../tools/hook-text.mjs";

test("lint: each `hooks.json` holds the texts of its text files", () => {
  for (const dir of hookDirs())
    assert.equal(
      fs.readFileSync(path.join(dir, "hooks.json"), "utf8"),
      format(withTexts(dir)),
      `${dir}: run node tools/hook-text.mjs`,
    );
});

const hooksDir = (json, files) => {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR, "hooks-"));
  fs.writeFileSync(path.join(dir, "hooks.json"), JSON.stringify(json));
  for (const [name, text] of Object.entries(files))
    fs.writeFileSync(path.join(dir, name), text);
  return dir;
};

test("the description joins its lines, and the prompt keeps its newlines", () => {
  const dir = hooksDir(
    { hooks: { Stop: [{ hooks: [{ type: "prompt", prompt: "old" }] }] } },
    {
      "description.txt": "One.\nTwo.\n",
      "Stop.prompt.txt": "Line 1.\nLine 2.\n",
    },
  );
  const json = withTexts(dir);
  assert.equal(json.description, "One. Two.");
  assert.equal(json.hooks.Stop[0].hooks[0].prompt, "Line 1.\nLine 2.");
});

test("a prompt file for an event with two `prompt` hooks is an error", () => {
  const prompt = { type: "prompt", prompt: "x" };
  const dir = hooksDir(
    { hooks: { Stop: [{ hooks: [prompt, prompt] }] } },
    { "Stop.prompt.txt": "y" },
  );
  assert.throws(() => withTexts(dir), /2 prompt hooks/);
});
