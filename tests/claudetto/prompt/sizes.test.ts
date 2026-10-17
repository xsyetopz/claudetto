// The size of each prompt variant and of each text that `claudetto` adds to the first request (E5, spec `prompt-profile`, "Measured size").
// Each pin is the size in bytes that `external/cc-2.1.299/scratch/v110/sizes-301.md` measured, and a test fails when a text grows past its pin.
// To change a text, measure the first request again and update the pin and the evidence file.

import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import path from "node:path";
import {
  spawnBlock,
  type VariantKey,
  variantSections,
} from "../../../plugins/claudetto/slices/prompt/domain/variants.ts";
import {
  TOOL_AGENT,
  TOOL_BASH,
  TOOL_READ,
} from "../../../plugins/claudetto/slices/surface/prompts.ts";

const PLUGIN = path.join(import.meta.dir, "../../../plugins/claudetto");

const ROOT = "/p";

const bytes = (text: string) => Buffer.byteLength(text);

/** The system text of a variant: the shared sections and the sections of the model. */
const variantText = (key: VariantKey) =>
  variantSections(key, ROOT)
    .map((s) => s.text)
    .join("\n\n");

/** The `description` of an agent file, which goes into the agent listing. */
const description = async (file: string) =>
  /^description:\s*(.*)$/m.exec(await Bun.file(file).text())?.[1] ?? "";

const VARIANT_PINS: Readonly<Record<VariantKey, number>> = {
  opus: 7428,
  sonnet: 7201,
  haiku: 7320,
  fable: 7335,
};

const BLOCK_PINS: Readonly<Record<VariantKey, number>> = {
  opus: 859,
  sonnet: 1075,
  haiku: 1164,
  fable: 859,
};

const TEXT_PINS: Readonly<Record<string, [text: string, pin: number]>> = {
  "output style `Concise`": [
    await Bun.file(path.join(PLUGIN, "output-styles/Concise.md")).text(),
    839,
  ],
  "`Agent` description": [TOOL_AGENT, 908],
  "`Bash` description": [TOOL_BASH, 746],
  "`Read` description": [TOOL_READ, 427],
};

const AGENT_PINS: Readonly<Record<string, number>> = {
  "debugger.md": 169,
  "implementer.md": 259,
  "investigator.md": 197,
  "planner.md": 224,
  "researcher.md": 212,
  "reviewer.md": 191,
};

for (const [key, pin] of Object.entries(VARIANT_PINS) as [
  VariantKey,
  number,
][]) {
  test(`the variant of \`${key}\` is at most ${pin} bytes`, () => {
    expect(bytes(variantText(key))).toBeLessThanOrEqual(pin);
  });
  test(`the subagent block of \`${key}\` is at most ${BLOCK_PINS[key]} bytes`, () => {
    expect(bytes(spawnBlock(key))).toBeLessThanOrEqual(BLOCK_PINS[key]);
  });
}

for (const [name, [text, pin]] of Object.entries(TEXT_PINS))
  test(`the ${name} is at most ${pin} bytes`, () => {
    expect(bytes(text)).toBeLessThanOrEqual(pin);
  });

test("each agent description is in its pin, and each agent has a pin", async () => {
  const sizes = Object.fromEntries(
    await Promise.all(
      readdirSync(path.join(PLUGIN, "agents")).map(async (f) => [
        f,
        bytes(await description(path.join(PLUGIN, "agents", f))),
      ]),
    ),
  );
  expect(Object.keys(sizes).sort()).toStrictEqual(
    Object.keys(AGENT_PINS).sort(),
  );
  for (const [f, size] of Object.entries(sizes))
    expect(size, f).toBeLessThanOrEqual(AGENT_PINS[f] ?? 0);
});

test("a variant that grows past its pin fails", () => {
  const grown = `${variantText("opus")}\n\nOne more line.`;
  expect(bytes(grown) <= VARIANT_PINS.opus).toBe(false);
});
