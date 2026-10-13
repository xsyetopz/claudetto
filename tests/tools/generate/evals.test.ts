// Behavior of `evals/hooks.json` in `tools/generate/emit/evals.ts`: the id of a classic hook and the id of a mod handler.
// Each test works in its own copy of the fixture under `TMPDIR`.

import { expect, test } from "bun:test";
import { generated } from "../../../tools/generate/outputs.ts";
import { fixtureRoot, textOf } from "./fixture.ts";

const COMMAND = `bun --no-env-file "\${CLAUDE_PLUGIN_ROOT}/slices/gamma/adapters/hook.ts" session-start`;

const EVALS = {
  requests: 0,
  tokens: 0,
  blocks: false,
  allow: "tests/gamma.test.ts > allows",
  text: "tests/gamma.test.ts > says",
};

const GAMMA = {
  "src/plugins/p/slices/gamma/adapters/mod.ts":
    "export const onTool = (): void => {};\n",
  "src/plugins/p/slices/gamma/slice.ts": `import { onTool } from "./adapters/mod.ts";
export const slice = {
  name: "gamma",
  mod: [{ event: "tool.call", phase: "observe", run: onTool, evals: ${JSON.stringify(EVALS)} }],
  hooks: [{ event: "SessionStart", command: ${JSON.stringify(COMMAND)}, timeout: 10, evals: ${JSON.stringify(EVALS)} }],
};
`,
};

test("a classic hook with `evals` and a mod handler with `evals` each get one entry, and the entry of a classic hook has the id of its command", async () => {
  const made = await generated(await fixtureRoot(GAMMA));
  const json = JSON.parse(textOf(made, "plugins/p/evals/hooks.json"));
  expect(Object.keys(json)).toStrictEqual([
    "SessionStart slices/gamma/adapters/hook.ts session-start",
    "tool.call gamma",
  ]);
  expect(
    json["SessionStart slices/gamma/adapters/hook.ts session-start"],
  ).toStrictEqual(EVALS);
});

test("a plugin whose hooks name no `evals` gets no evals file", async () => {
  const made = await generated(await fixtureRoot());
  expect(made.some((o) => o.file.endsWith("/evals/hooks.json"))).toBeFalse();
});

test("two classic hooks with one command and different `evals` fail the generator", async () => {
  const other = { ...EVALS, text: "tests/gamma.test.ts > differs" };
  const dir = await fixtureRoot({
    "src/plugins/p/slices/gamma/slice.ts": `export const slice = {
  name: "gamma",
  hooks: [
    { event: "SessionStart", command: ${JSON.stringify(COMMAND)}, evals: ${JSON.stringify(EVALS)} },
    { event: "SessionStart", command: ${JSON.stringify(COMMAND)}, evals: ${JSON.stringify(other)} },
  ],
};
`,
  });
  await expect(generated(dir)).rejects.toThrow();
});
