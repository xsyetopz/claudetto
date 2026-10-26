// Lab tests of the `guard` hooks on `Monitor`, `TaskStop`, and `gh ... create` (task 10.4 and the `gh` part of task 10.11).
// The stub of `tool.call` stands for core: it runs no tool, and it keeps the input that reached it.
// The file is self-contained, because a lab test cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const TAIL = "tail -f /tmp/a.log | grep --line-buffered FAIL";

/** Stubs core, the clock, and the `Stop` event. `world.now` is the time of the host, and `world.seen` holds the input of each call that reached core. */
const stub = (
  on: On,
  refuse?: { isError: true; result: unknown } | { deny: string },
) => {
  const world = { now: 1_000, next: 0, seen: [] as Record<string, unknown>[] };
  on("clock.now", () => ({ value: world.now }));
  on("session.cwd", () => ({ value: "/p" }));
  on("env.get", (_$, e) => ({ value: e.name === "HOME" ? "/u" : undefined }));
  on("classic.Stop", () => ({}));
  // Each process finds nothing, so the project holds no env file.
  on("process.run", () => ({
    value: {
      exitCode: 0,
      stdout: "",
      stderr: "",
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }));
  on("tool.call", (_$, e) => {
    world.seen.push(e as unknown as Record<string, unknown>);
    if (refuse) return refuse;
    return e.tool === "Monitor"
      ? { result: { taskId: `b${++world.next}`, timeoutMs: 300_000 } }
      : { result: "ok" };
  });
  return world;
};

const monitor = ($: Engine, command: string) =>
  $.tool.call({
    tool: "Monitor",
    command,
    description: "watch the log",
    timeout_ms: 300_000,
  });

const stop = ($: Engine, ids: string[]) =>
  $.classic.Stop({
    stop_hook_active: false,
    background_tasks: ids.map((id) => ({
      id,
      type: "monitor",
      status: "running",
      description: "watch the log",
    })),
  });

test("Duplicate Monitor: a second `Monitor` with the command of a running one gets a short result that names the task and `TaskStop`", async ($: Engine, on: On) => {
  const world = stub(on);
  expect((await monitor($, TAIL)).deny).toBeUndefined();
  const second = await monitor($, TAIL);
  expect(second.deny).toContain("`b1`");
  expect(second.deny).toContain("`TaskStop`");
  expect(world.seen.length).toBe(1);
  expect((await monitor($, "tail -f /tmp/b.log")).deny).toBeUndefined();
});

test("Duplicate Monitor: after a `TaskStop` of its ID, the same command runs again", async ($: Engine, on: On) => {
  stub(on);
  await monitor($, TAIL);
  await $.tool.call({ tool: "TaskStop", task_id: "b1" });
  expect((await monitor($, TAIL)).deny).toBeUndefined();
});

test("Duplicate Monitor: a `Stop` that lists the task keeps it, and a `Stop` that does not list it drops it", async ($: Engine, on: On) => {
  stub(on);
  await monitor($, TAIL);
  await stop($, ["b1"]);
  expect((await monitor($, TAIL)).deny).toContain("`b1`");
  await stop($, ["other"]);
  expect((await monitor($, TAIL)).deny).toBeUndefined();
});

test("Duplicate Monitor: after its deadline, the same command runs again", async ($: Engine, on: On) => {
  const world = stub(on);
  await monitor($, TAIL);
  world.now += 299_000;
  expect((await monitor($, TAIL)).deny).toContain("`b1`");
  world.now += 2_000;
  expect((await monitor($, TAIL)).deny).toBeUndefined();
});

const gh = ($: Engine, command: string) =>
  $.tool.call({ tool: "Bash", command });

test("Title Case of `gh`: `gh pr create --title` and `gh issue create -t` run with a title in Chicago Title Case, and the result tells the model", async ($: Engine, on: On) => {
  const world = stub(on);
  const pr = await gh(
    $,
    "gh pr create --title 'fix a bug in the `guard` slice' --body \"x -t y\"",
  );
  expect(world.seen[0]?.["command"]).toBe(
    "gh pr create --title 'Fix a Bug in the `guard` Slice' --body \"x -t y\"",
  );
  expect((pr.context ?? []).join("\n")).toContain("Title Case");
  expect(pr.result).toBe("ok");
  await gh($, "cd /p && gh issue create -t 'add the --title fix' --label bug");
  expect(world.seen[1]?.["command"]).toBe(
    "cd /p && gh issue create -t 'Add the --title Fix' --label bug",
  );
});

test("Title Case of `gh`: a title in the right case, a title with `$`, and another command run as typed", async ($: Engine, on: On) => {
  const world = stub(on);
  const commands = [
    'gh pr create --title "Fix a Bug in the Parser"',
    'gh pr create --title "fix $(date) bug"',
    "gh pr list --title 'fix a bug'",
    "ls -t 'old files'",
  ];
  for (const command of commands) await gh($, command);
  expect(world.seen.map((e) => e["command"])).toStrictEqual(commands);
});

test("Duplicate Monitor: a `Monitor` that core refuses joins no set, so the same command runs again", async ($: Engine, on: On) => {
  stub(on, { result: { taskId: "b9", timeoutMs: 300_000 }, isError: true });
  await monitor($, TAIL);
  expect((await monitor($, TAIL)).deny).toBeUndefined();
});

test("Duplicate Monitor: a `Stop` with no `background_tasks` keeps the set", async ($: Engine, on: On) => {
  stub(on);
  await monitor($, TAIL);
  await $.classic.Stop({ stop_hook_active: false });
  expect((await monitor($, TAIL)).deny).toContain("`b1`");
});

test("Title Case of `gh`: a call that core denies gets no context", async ($: Engine, on: On) => {
  stub(on, { deny: "blocked" });
  const v = await gh($, "gh pr create --title 'fix a bug'");
  expect([v.deny, v.context]).toStrictEqual(["blocked", undefined]);
});
