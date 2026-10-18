// The RED forms of `design-prompts.md` (D55) that a text of ours must not hold, and the GREEN forms that the shipped text holds as its example.
// The RED forms that need a model run are eval cases in `src/plugins/claudetto/slices/prompt/evals/`.

import { expect, test } from "bun:test";
import path from "node:path";
import { LEAN_BODY } from "../../../plugins/claudetto/slices/prompt/domain/lean-body.ts";
import { NOT_INSTALLED } from "../../../plugins/claudetto-browser/slices/browse/prompts.ts";

const read = (rel: string) =>
  Bun.file(path.join(import.meta.dir, "../../..", rel)).text();

const SHIPPED: Readonly<Record<string, string>> = {
  "system prompt": LEAN_BODY,
  "output style `Concise`": await read(
    "src/plugins/claudetto/slices/styles/styles/Concise.md",
  ),
  "text of a missing `agent-browser`": NOT_INSTALLED,
};

const REDS: readonly string[] = [
  "class ConfigLoader",
  "You're right. I should have",
  "isn't installed, so I can't",
  "Ask the user to install",
  "Both checks pass.",
  "You used 91K of 100K tokens",
  "You MUST use this tool",
  "CRITICAL:",
];

for (const [name, text] of Object.entries(SHIPPED))
  test(`the ${name} holds no RED form of the table of D55`, () => {
    for (const red of REDS) expect(text, red).not.toContain(red);
  });

test("the system prompt holds the GREEN examples of the least code and of a missing tool", () => {
  expect(LEAN_BODY).toContain('JSON.parse(fs.readFileSync(path, "utf8"))');
  expect(LEAN_BODY).toContain("brew install yt-dlp");
});

test("the text of a missing `agent-browser` tells the agent to install it", () => {
  expect(NOT_INSTALLED).toContain("npm install -g agent-browser");
  expect(NOT_INSTALLED.toLowerCase()).toContain("install it");
  expect(NOT_INSTALLED).not.toContain("Ask the user");
});
