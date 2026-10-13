// The hook lab of the implement hook of the `spec` slice: `claude plugin test plugins/dotclaude` fires `agent.spawn` with stubs.
// No subagent starts, no command runs, and no model call goes out.
// The stub of `process.run` is the test's own, so the live `dotclaude-spec implement` and its refusal in a worktree are not tested here.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const BRIEF = "---\nid: P33\ndeps: [P19]\n---\n\n# P33 Zero token cost";

/** The folder of the session. */
const session = { cwd: "/project" };

/** The stubs of one test: the engine answers the spawn, and `process.run` lists each `implement` call and its folder in `folders`. */
const stub = (
  on: On,
  agentId = "a1",
  exitCode = 0,
  folders: (string | undefined)[] = [],
) => {
  const runs: string[] = [];
  session.cwd = "/project";
  on("session.cwd", () => ({ value: session.cwd }));
  on("agent.spawn", () => ({ model: "claude-sonnet-5-5", agentId }));
  on("process.run", (_$, e) => {
    runs.push(e.argv.slice(3).join(" "));
    folders.push(e.init?.cwd);
    return {
      value: {
        exitCode,
        stdout: "",
        stderr: exitCode === 0 ? "" : "implement refused",
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    };
  });
  return runs;
};

const spawn = ($: Engine, prompt: string, subagentType = "implementer") =>
  $.agent.spawn({
    tool_use_id: "u1",
    prompt,
    description: "a package",
    subagentType,
    provider: { plugin: "dotclaude", tier: "user" },
    parentModel: "claude-sonnet-5-5",
    background: false,
    fork: false,
  });

test("the spawn of an implementer runs `implement` for its package", async ($: Engine, on: On) => {
  const runs = stub(on);
  await spawn($, BRIEF);
  expect(runs).toEqual(["implement P33"]);
});

test("a spawn with no brief in its prompt runs no command", async ($: Engine, on: On) => {
  const runs = stub(on);
  await spawn($, "Read the files.");
  expect(runs).toEqual([]);
});

test("a spawn of another agent type runs no command", async ($: Engine, on: On) => {
  const runs = stub(on);
  await spawn($, BRIEF, "reviewer");
  expect(runs).toEqual([]);
});

test("a prompt that quotes `id: P12` in its body runs no command", async ($: Engine, on: On) => {
  const runs = stub(on);
  await spawn($, "Read the brief.\nid: P12\nThen stop.");
  await spawn($, "---\ntitle: x\n---\nid: P12");
  expect(runs).toEqual([]);
});

test("an `implement` run that exits 1 is logged", async ($: Engine, on: On) => {
  stub(on, "a1", 1);
  const logs: string[] = [];
  on("ui.log", (_$, e, next) => {
    logs.push(e.text);
    return next(e);
  });
  await spawn($, BRIEF);
  expect(logs.some((t) => t.includes("implement refused"))).toBe(true);
});

test("the `implement` run uses the folder of the session at the spawn", async ($: Engine, on: On) => {
  const folders: (string | undefined)[] = [];
  stub(on, "a1", 0, folders);
  await spawn($, BRIEF);
  expect(folders).toEqual(["/project"]);
});
