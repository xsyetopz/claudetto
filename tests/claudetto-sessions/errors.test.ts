// Error policy of `claudetto-sessions`: a `catch` handles the error that it expects and passes the others on.
// An expected error is an absent file or a line that is not JSON.
// An unexpected error is a symbolic link that points to itself (`ELOOP`), which the tests make in a folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { rethrowUnless } from "../../src/kernel/errors.ts";
import { store } from "../../src/plugins/claudetto-sessions/slices/usage/adapters/store.ts";
import { installedSkills } from "../../src/plugins/claudetto-sessions/slices/usage/domain/runs.ts";
import {
  agentType,
  readEntries,
} from "../../src/plugins/claudetto-sessions/slices/usage/domain/transcript.ts";
import {
  maxTurns,
  turnsFromText,
} from "../../src/plugins/claudetto-sessions/slices/usage/domain/turns.ts";
import { tmpDir } from "../support/repo.ts";

const dir = tmpDir("sessions-errors");
// On Windows a link has a kind, so a loop to a folder needs `"dir"`, or the link reads as a file.
const loopTo = (file: string, kind?: "dir") => fs.symlinkSync(file, file, kind);

test("`rethrowUnless` returns for a listed code or name and throws the rest", async () => {
  rethrowUnless(Object.assign(new Error("x"), { code: "ENOENT" }), "ENOENT");
  rethrowUnless(new SyntaxError("x"), "SyntaxError");
  const other = new RangeError("x");
  expect(() => rethrowUnless(other, "ENOENT")).toThrow(other);
});

test("lines that are not JSON are skipped in a transcript and in the turn count", async () => {
  const file = path.join(dir, "t.jsonl");
  await Bun.write(file, '{cut\n{"type":"assistant"}\n\n');
  expect(await readEntries(store, file)).toStrictEqual([{ type: "assistant" }]);
  expect(turnsFromText("{cut\n")).toBe(0);
});

test("a subagent with no meta file, or a damaged one, has the type `subagent`", async () => {
  const sub = path.join(dir, "subagents");
  fs.mkdirSync(sub);
  const run = path.join(sub, "agent-a.jsonl");
  expect(await agentType(store, run)).toBe("subagent");
  await Bun.write(path.join(sub, "agent-a.meta.json"), "{");
  expect(await agentType(store, run)).toBe("subagent");
  await Bun.write(path.join(sub, "agent-a.meta.json"), '{"agentType":"x"}');
  expect(await agentType(store, run)).toBe("x");
});

test("a meta file that cannot be read for another reason is an error", async () => {
  const sub = path.join(dir, "loop-run", "subagents");
  fs.mkdirSync(sub, { recursive: true });
  loopTo(path.join(sub, "agent-b.meta.json"));
  await expect(
    agentType(store, path.join(sub, "agent-b.jsonl")),
  ).rejects.toThrow(
    expect.objectContaining({
      code: "ELOOP",
    }),
  );
});

test("`maxTurns` gives null for an absent agent file and throws any other read error", async () => {
  const agents = fs.mkdtempSync(path.join(dir, "agents-"));
  expect(await maxTurns(store, "nobody", agents)).toBe(null);
  await Bun.write(path.join(agents, "ok.md"), "---\nmaxTurns: 30\n---\n");
  expect(await maxTurns(store, "ok", agents)).toBe(30);
  loopTo(path.join(agents, "bad.md"));
  await expect(maxTurns(store, "bad", agents)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});

test("`installedSkills` gives no skills for an absent config, a damaged plugin file, or a folder with no `SKILL.md`", async () => {
  const config = fs.mkdtempSync(path.join(dir, "config-"));
  expect(await installedSkills(store, config)).toStrictEqual([]);
  fs.mkdirSync(path.join(config, "plugins"));
  await Bun.write(path.join(config, "plugins", "installed_plugins.json"), "{");
  fs.mkdirSync(path.join(config, "skills", "empty"), { recursive: true });
  fs.mkdirSync(path.join(config, "skills", "real"));
  await Bun.write(
    path.join(config, "skills", "real", "SKILL.md"),
    "---\nname: real\n---\n",
  );
  expect(await installedSkills(store, config)).toStrictEqual([
    { name: "real", chars: 0 },
  ]);
});

test("`installedSkills` throws a read error that is not an absent file", async () => {
  const config = fs.mkdtempSync(path.join(dir, "config-"));
  loopTo(path.join(config, "skills"), "dir");
  await expect(installedSkills(store, config)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});
