// Error policy of `dotclaude-sessions`: a `catch` handles the error that it expects and passes the others on.
// An expected error is an absent file or a line that is not JSON.
// An unexpected error is a symbolic link that points to itself (`ELOOP`), which the tests make in a folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { installedSkills } from "../../plugins/dotclaude-sessions/features/usage/runs.ts";
import {
  maxTurns,
  turnsFromText,
} from "../../plugins/dotclaude-sessions/features/usage/turns.ts";
import { rethrowUnless } from "../../plugins/dotclaude-sessions/lib/errors.ts";
import {
  agentType,
  readEntries,
} from "../../plugins/dotclaude-sessions/lib/transcript.ts";
import { tmpDir } from "../support/repo.ts";

const dir = tmpDir("sessions-errors");
const loopTo = (file: string) => fs.symlinkSync(file, file);

test("`rethrowUnless` returns for a listed code or name and throws the rest", async () => {
  rethrowUnless(Object.assign(new Error("x"), { code: "ENOENT" }), "ENOENT");
  rethrowUnless(new SyntaxError("x"), "SyntaxError");
  const other = new RangeError("x");
  expect(() => rethrowUnless(other, "ENOENT")).toThrow(other);
});

test("lines that are not JSON are skipped in a transcript and in the turn count", async () => {
  const file = path.join(dir, "t.jsonl");
  await Bun.write(file, '{cut\n{"type":"assistant"}\n\n');
  expect(await readEntries(file)).toStrictEqual([{ type: "assistant" }]);
  expect(turnsFromText("{cut\n")).toBe(0);
});

test("a subagent with no meta file, or a damaged one, has the type `subagent`", async () => {
  const sub = path.join(dir, "subagents");
  fs.mkdirSync(sub);
  const run = path.join(sub, "agent-a.jsonl");
  expect(await agentType(run)).toBe("subagent");
  await Bun.write(path.join(sub, "agent-a.meta.json"), "{");
  expect(await agentType(run)).toBe("subagent");
  await Bun.write(path.join(sub, "agent-a.meta.json"), '{"agentType":"x"}');
  expect(await agentType(run)).toBe("x");
});

test("a meta file that cannot be read for another reason is an error", async () => {
  const sub = path.join(dir, "loop-run", "subagents");
  fs.mkdirSync(sub, { recursive: true });
  loopTo(path.join(sub, "agent-b.meta.json"));
  await expect(agentType(path.join(sub, "agent-b.jsonl"))).rejects.toThrow(
    expect.objectContaining({
      code: "ELOOP",
    }),
  );
});

test("`maxTurns` gives null for an absent agent file and throws any other read error", async () => {
  const agents = fs.mkdtempSync(path.join(dir, "agents-"));
  expect(await maxTurns("nobody", agents)).toBe(null);
  await Bun.write(path.join(agents, "ok.md"), "---\nmaxTurns: 30\n---\n");
  expect(await maxTurns("ok", agents)).toBe(30);
  loopTo(path.join(agents, "bad.md"));
  await expect(maxTurns("bad", agents)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});

test("`installedSkills` gives no skills for an absent config, a damaged plugin file, or a folder with no `SKILL.md`", async () => {
  const config = fs.mkdtempSync(path.join(dir, "config-"));
  expect(await installedSkills(config)).toStrictEqual([]);
  fs.mkdirSync(path.join(config, "plugins"));
  await Bun.write(path.join(config, "plugins", "installed_plugins.json"), "{");
  fs.mkdirSync(path.join(config, "skills", "empty"), { recursive: true });
  fs.mkdirSync(path.join(config, "skills", "real"));
  await Bun.write(
    path.join(config, "skills", "real", "SKILL.md"),
    "---\nname: real\n---\n",
  );
  expect(await installedSkills(config)).toStrictEqual([
    { name: "real", chars: 0 },
  ]);
});

test("`installedSkills` throws a read error that is not an absent file", async () => {
  const config = fs.mkdtempSync(path.join(dir, "config-"));
  loopTo(path.join(config, "skills"));
  await expect(installedSkills(config)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});
