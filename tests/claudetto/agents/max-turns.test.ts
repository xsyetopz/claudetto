// Tests of the turn bound and the effort floor of the agents.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  AGENT_EFFORT_FLOOR,
  AGENT_MAX_TURNS,
} from "../../../src/plugins/claudetto/slices/agents/limits.ts";
import { agentFaults } from "../../../tools/validate.ts";
import { REPO } from "../../support/repo.ts";

const DIR = path.join(REPO, "src/plugins/claudetto/slices/agents/agents");

const agent = (effort: string, turns: string): string =>
  `---\nname: x\neffort: ${effort}\nmaxTurns: ${turns}\n---\nBody\n`;

test("each agent file has the `maxTurns` of `AGENT_MAX_TURNS`, and no other agent has one", async () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md"));
  expect(files.map((f) => f.slice(0, -3)).sort()).toStrictEqual(
    Object.keys(AGENT_MAX_TURNS).sort(),
  );
  for (const f of files) {
    const text = await Bun.file(path.join(DIR, f)).text();
    expect(text, f).toContain(
      `\nmaxTurns: ${AGENT_MAX_TURNS[f.slice(0, -3)]}\n`,
    );
  }
});

test("the validation fails on an agent at `low` or with no effort", () => {
  expect(AGENT_EFFORT_FLOOR).toBe("medium");
  expect(agentFaults("a.md", agent("low", "10"))[0]).toMatch(/below medium/);
  expect(agentFaults("a.md", "---\nname: x\nmaxTurns: 10\n---\n")[0]).toMatch(
    /absent/,
  );
  expect(agentFaults("a.md", agent("medium", "10"))).toStrictEqual([]);
  expect(agentFaults("a.md", agent("max", "10"))).toStrictEqual([]);
});

test("the validation fails on a `maxTurns` that is not a positive integer", () => {
  for (const bad of ["0", "-1", "2.5", "many"])
    expect(agentFaults("a.md", agent("high", bad))[0]).toMatch(/maxTurns/);
});
