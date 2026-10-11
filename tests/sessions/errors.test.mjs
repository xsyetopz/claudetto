// Error policy of `dotclaude-sessions`: a `catch` handles the error that it expects and passes the others on.
// An expected error is an absent file or a line that is not JSON.
// An unexpected error is a symbolic link that points to itself (`ELOOP`), which the tests make in a folder under `TMPDIR`.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { installedSkills } from "../../plugins/dotclaude-sessions/features/usage/runs.mjs";
import {
  maxTurns,
  turnsFromText,
} from "../../plugins/dotclaude-sessions/features/usage/turns.mjs";
import { rethrowUnless } from "../../plugins/dotclaude-sessions/lib/errors.mjs";
import {
  agentType,
  readEntries,
} from "../../plugins/dotclaude-sessions/lib/transcript.mjs";
import { tmpDir } from "../support/repo.mjs";

const dir = tmpDir("sessions-errors");
const loopTo = (file) => fs.symlinkSync(file, file);

test("`rethrowUnless` returns for a listed code or name and throws the rest", () => {
  rethrowUnless(Object.assign(new Error("x"), { code: "ENOENT" }), "ENOENT");
  rethrowUnless(new SyntaxError("x"), "SyntaxError");
  const other = new RangeError("x");
  assert.throws(() => rethrowUnless(other, "ENOENT"), other);
});

test("lines that are not JSON are skipped in a transcript and in the turn count", () => {
  const file = path.join(dir, "t.jsonl");
  fs.writeFileSync(file, '{cut\n{"type":"assistant"}\n\n');
  assert.deepEqual(readEntries(file), [{ type: "assistant" }]);
  assert.equal(turnsFromText("{cut\n"), 0);
});

test("a subagent with no meta file, or a damaged one, has the type `subagent`", () => {
  const sub = path.join(dir, "subagents");
  fs.mkdirSync(sub);
  const run = path.join(sub, "agent-a.jsonl");
  assert.equal(agentType(run), "subagent");
  fs.writeFileSync(path.join(sub, "agent-a.meta.json"), "{");
  assert.equal(agentType(run), "subagent");
  fs.writeFileSync(path.join(sub, "agent-a.meta.json"), '{"agentType":"x"}');
  assert.equal(agentType(run), "x");
});

test("a meta file that cannot be read for another reason is an error", () => {
  const sub = path.join(dir, "loop-run", "subagents");
  fs.mkdirSync(sub, { recursive: true });
  loopTo(path.join(sub, "agent-b.meta.json"));
  assert.throws(() => agentType(path.join(sub, "agent-b.jsonl")), {
    code: "ELOOP",
  });
});

test("`maxTurns` gives null for an absent agent file and throws any other read error", () => {
  const agents = fs.mkdtempSync(path.join(dir, "agents-"));
  assert.equal(maxTurns("nobody", agents), null);
  fs.writeFileSync(path.join(agents, "ok.md"), "---\nmaxTurns: 30\n---\n");
  assert.equal(maxTurns("ok", agents), 30);
  loopTo(path.join(agents, "bad.md"));
  assert.throws(() => maxTurns("bad", agents), { code: "ELOOP" });
});

test("`installedSkills` gives no skills for an absent config, a damaged plugin file, or a folder with no `SKILL.md`", () => {
  const config = fs.mkdtempSync(path.join(dir, "config-"));
  assert.deepEqual(installedSkills(config), []);
  fs.mkdirSync(path.join(config, "plugins"));
  fs.writeFileSync(path.join(config, "plugins", "installed_plugins.json"), "{");
  fs.mkdirSync(path.join(config, "skills", "empty"), { recursive: true });
  fs.mkdirSync(path.join(config, "skills", "real"));
  fs.writeFileSync(
    path.join(config, "skills", "real", "SKILL.md"),
    "---\nname: real\n---\n",
  );
  assert.deepEqual(installedSkills(config), [{ name: "real", chars: 0 }]);
});

test("`installedSkills` throws a read error that is not an absent file", () => {
  const config = fs.mkdtempSync(path.join(dir, "config-"));
  loopTo(path.join(config, "skills"));
  assert.throws(() => installedSkills(config), { code: "ELOOP" });
});
