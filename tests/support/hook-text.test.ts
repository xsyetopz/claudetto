// Behavior of `tools/hook-text.ts`: each `hooks.json` holds the texts of its text files,
// and a prompt file needs exactly one `prompt` hook on its event.
// Each test that writes files works in its own folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { format, hookDirs, withTexts } from "../../tools/hook-text.ts";

test("lint: each `hooks.json` holds the texts of its text files", async () => {
  for (const dir of hookDirs())
    expect(
      await Bun.file(path.join(dir, "hooks.json")).text(),
      `${dir}: run node tools/hook-text.ts`,
    ).toBe(format(await withTexts(dir)));
});

const hooksDir = async (
  json: unknown,
  files: Record<string, string>,
): Promise<string> => {
  const dir = fs.mkdtempSync(
    path.join(process.env["TMPDIR"] as string, "hooks-"),
  );
  await Bun.write(path.join(dir, "hooks.json"), JSON.stringify(json));
  for (const [name, text] of Object.entries(files))
    await Bun.write(path.join(dir, name), text);
  return dir;
};

test("the description joins its lines, and the prompt keeps its newlines", async () => {
  const dir = await hooksDir(
    { hooks: { Stop: [{ hooks: [{ type: "prompt", prompt: "old" }] }] } },
    {
      "description.txt": "One.\nTwo.\n",
      "Stop.prompt.txt": "Line 1.\nLine 2.\n",
    },
  );
  const json = await withTexts(dir);
  expect(json.description).toBe("One. Two.");
  expect(json.hooks?.["Stop"]?.[0]?.hooks[0]?.prompt).toBe("Line 1.\nLine 2.");
});

test("a prompt file for an event with two `prompt` hooks is an error", async () => {
  const prompt = { type: "prompt", prompt: "x" };
  const dir = await hooksDir(
    { hooks: { Stop: [{ hooks: [prompt, prompt] }] } },
    { "Stop.prompt.txt": "y" },
  );
  await expect(withTexts(dir)).rejects.toThrow(/2 prompt hooks/);
});
