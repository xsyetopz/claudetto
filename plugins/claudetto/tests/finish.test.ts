// Lab tests of the `finish` slice: `/goal` sets one check command, and the `Stop` hook blocks the stop until the check exits `0`, up to a cap.
// The file also holds the tests of the notes, of the `box` hook, and of the loop block, and `stubs/finish.ts` has the stubs.

import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
  answered,
  applied,
  logs,
  looped,
  type Note,
  PLAN,
  prompt,
  reply,
  slash,
  stop,
  stub,
  tasks,
  tick,
  ticks,
  typed,
} from "./stubs/finish.ts";

test("the stop is blocked until the check exits `0`", async ($: Engine, on: On) => {
  const world = stub(on, { check: "just check" }, [1, 1, 0]);
  const first = await stop($);
  expect(first.block).toContain("just check");
  expect(first.block).toContain("FAIL: 2 tests");
  expect((await stop($, true)).block).toContain("FAIL: 2 tests");
  expect((await stop($, true)).block).toBeUndefined();
  expect(world.runs[0]).toEqual(["sh", "-c", "just check"]);
  expect(world.state()).toBeNull();
});

test("with no goal the stop goes on, and no check runs", async ($: Engine, on: On) => {
  const world = stub(on);
  expect((await stop($)).block).toBeUndefined();
  expect(world.runs).toEqual([]);
});

test("a goal whose check passes at once lets the stop go on, and the goal clears", async ($: Engine, on: On) => {
  const world = stub(on, { check: "just check" }, [0]);
  expect((await stop($)).block).toBeUndefined();
  expect(world.runs).toEqual([["sh", "-c", "just check"]]);
  expect(world.state()).toBeNull();
});

test("a goal stays set while the check fails", async ($: Engine, on: On) => {
  const world = stub(on, { check: "just check" }, [2]);
  await stop($);
  expect(world.state()).toEqual({ check: "just check" });
});

test("another command runs unchanged", async ($: Engine, on: On) => {
  stub(on);
  expect((await slash($, "compact")).text).toBe("core compact");
});

test("the built-in `/goal` does not run, and the hook answers", async ($: Engine, on: On) => {
  stub(on);
  expect((await typed($, "status")).text).toBe("No goal.");
});

test("a condition sets the check, with the backticks cut, and the first turn starts", async ($: Engine, on: On) => {
  const world = stub(on);
  const out = await typed($, "`just check`");
  expect(out.text).toContain("just check");
  expect(world.state()).toEqual({ check: "just check" });
});

test("a slash command is no check: `/goal` refuses it with an example, the built-in does not run, and a stored one blocks no stop", async ($: Engine, on: On) => {
  const world = stub(on, { check: "/claudetto:apply release-0-3-0-alpha-2" });
  expect((await stop($)).block).toBeUndefined();
  expect(world.runs).toEqual([]);
  const out = await typed($, "/claudetto:apply release-0-3-0-alpha-2");
  expect(out.text).toContain("/goal just check");
  expect(world.prompts).toEqual([]);
  expect((await typed($, "/usr/bin/true")).text).toContain("/usr/bin/true");
});

test("`status` shows the check, and `clear` removes the goal", async ($: Engine, on: On) => {
  const world = stub(on, { check: "just check" });
  expect((await typed($, "status")).text).toContain("just check");
  await typed($, "clear");
  expect(world.state()).toBeNull();
});

test("the attachment `goal_status` is left out", async ($: Engine, on: On) => {
  on("prompt.attachment", () => ({ text: "kept" }));
  const out = await $.prompt.attachment({ type: "goal_status" } as never);
  expect(out.text).toBeNull();
});

test("the stop is blocked at most 5 times in a row, then it goes on with a line to the user, and the goal stays", async ($: Engine, on: On) => {
  const world = stub(on, { check: "just check" }, [1]);
  const lines = logs(on);
  for (let i = 0; i < 5; i++)
    expect((await stop($, i > 0)).block).toContain("just check");
  expect((await stop($, true)).block).toBeUndefined();
  expect(lines.join("\n")).toContain("just check");
  expect(lines.join("\n")).toContain("5 blocked stops");
  expect(world.state()).toEqual({ check: "just check" });
  expect((await stop($)).block).toContain("just check");
});

test("a pass resets the count of blocks", async ($: Engine, on: On) => {
  stub(on, { check: "just check" }, [1, 1, 0, 1]);
  logs(on);
  expect((await stop($)).block).toBeDefined();
  expect((await stop($, true)).block).toBeDefined();
  expect((await stop($, true)).block).toBeUndefined();
});

// The notes of the `Stop` hook for a reply that defers work or says "done" with no proof.

test("a reply that defers work sets one note that names the item, and the stop goes on", async ($: Engine, on: On) => {
  const world = stub(on);
  const out = await reply(
    $,
    "Not done: the side check. I deleted its temp folder without rerunning it.",
  );
  expect(out.block).toBeUndefined();
  const value = world.store.get("note") as Note | undefined;
  expect(value?.tag).toBe("Deferred");
  expect(value?.line).toContain("side check");
});

test("a reply that names a sandbox deny sets no note", async ($: Engine, on: On) => {
  const world = stub(on);
  await reply(
    $,
    "Not done: the old processes. The sandbox denied `pkill`, so run `! pkill -f old`.",
  );
  expect(world.store.get("note") ?? null).toBeNull();
});

test("a reply that says ready, with an edited file not committed, sets a note that names the file", async ($: Engine, on: On) => {
  const world = stub(on);
  const edit = {
    tool_use_id: "e1",
    tool: "Edit",
    input: { file_path: "/proj/plugins/a.ts" },
    text: "ok",
  };
  on("session.messages", () => ({
    value: [
      { role: "assistant", text: "", toolUses: [edit], handle: "h" },
    ] as SessionMessage[],
  }));
  world.git.out = " M plugins/a.ts\0";
  await reply($, "`0.3.0-alpha.1` is ready to publish.");
  const value = world.store.get("note") as Note | undefined;
  expect(value?.line).toContain("plugins/a.ts");
});

test("a reply that says done, with a clean tree, sets no note", async ($: Engine, on: On) => {
  const world = stub(on);
  on("session.messages", () => ({ value: [] as SessionMessage[] }));
  world.git.out = "";
  await reply($, "Done.");
  expect(world.store.get("note") ?? null).toBeNull();
});

test("Heading Case: a reply heading in the wrong case sets a note with the right case, and a code block or a right heading sets none", async ($: Engine, on: On) => {
  const world = stub(on);
  const noteAfter = async (text: string) => {
    world.store.delete("note");
    await reply($, text);
    return world.store.get("note") as Note | undefined;
  };
  const wrong = await noteAfter(
    "## the guide to `hooks.json`\n\n## What to do in a crisis\n",
  );
  expect(wrong?.tag).toBe("Heading case");
  expect(wrong?.line).toContain("The Guide to `hooks.json`");
  expect(
    (await noteAfter("```sh\n# not a heading\n```\n"))?.tag,
  ).toBeUndefined();
  expect(await noteAfter("## What I Need from You\n")).toBeUndefined();
});

// The `box` hook: a task box that changes to checked needs a passed check in the session.
test("Tick with No Check: the box of a task with no passed check is denied with the task id", async ($: Engine, on: On) => {
  tasks(on);
  const out = await tick($, "10.1");
  expect("deny" in out ? out.deny : "").toContain("10.1");
});

test("Tick with a Passed Check: the edit runs", async ($: Engine, on: On) => {
  tasks(on, ["just check"]);
  expect("deny" in (await tick($, "10.1"))).toBe(false);
});

test("a task that names `just lab` needs that check", async ($: Engine, on: On) => {
  tasks(on, ["just check"]);
  expect("deny" in (await tick($, "10.2"))).toBe(true);
});

test("Other Edit: a change of the text with the box as it was runs", async ($: Engine, on: On) => {
  tasks(on);
  const out = await $.tool.call({
    tool: "Edit",
    file_path: "/p/tasks.md",
    old_string: "Add the test",
    new_string: "Write the test",
  });
  expect("deny" in out).toBe(false);
});

// The loop block of the `Stop` hook: a stop after a ticked box with an open box left is blocked, up to a cap.

const OPEN = "- [x] 3.7 Do it\n- [ ] 3.8 Next\n- [ ] 3.11 Last\n";
const DONE = "- [x] 3.7 Do it\n- [x] 3.8 Next\n";

test("Tick with Open Task: the stop is blocked, and the count of blocks is 1", async ($: Engine, on: On) => {
  const world = looped(on);
  world.files.set(PLAN, OPEN);
  world.rows.push(prompt("apply"), ticks("3.7"), answered());
  const out = await reply($, "Done with 3.7.");
  expect(out.block).toBeDefined();
  expect(out.block).toContain("3.8");
  expect(out.block).toContain("AskUserQuestion");
  expect(world.store.get("loopBlocks")).toBe(1);
});

test("Last Task Ticked: no open box is left, so the stop goes on", async ($: Engine, on: On) => {
  const world = looped(on);
  world.files.set(PLAN, DONE);
  world.rows.push(prompt("apply"), ticks("3.8"), answered());
  expect((await reply($, "All tasks done.")).block).toBeUndefined();
  expect(world.store.get("loopBlocks") ?? 0).toBe(0);
});

test("No Tick in Turn: a tick before the last prompt, or no tick, never blocks", async ($: Engine, on: On) => {
  const world = looped(on);
  world.files.set(PLAN, OPEN);
  world.rows.push(ticks("3.7"), prompt("what is next?"), answered());
  expect((await reply($, "Next is 3.8.")).block).toBeUndefined();
  world.rows.length = 0;
  world.rows.push(applied(), prompt("hello"));
  expect((await reply($, "Hi.")).block).toBeUndefined();
  expect(world.store.get("loopBlocks") ?? 0).toBe(0);
});

test("a tick of a file that is not a tasks.md never blocks", async ($: Engine, on: On) => {
  const world = looped(on);
  world.files.set("/proj/notes.md", OPEN);
  world.rows.push(prompt("apply"), ticks("3.7", "/proj/notes.md"));
  expect((await reply($, "Done with 3.7.")).block).toBeUndefined();
});

test("Cap Reached: 5 blocks in a row, then the stop goes on with a line to the user, and the count is clear", async ($: Engine, on: On) => {
  const world = looped(on);
  const lines = logs(on);
  world.files.set(PLAN, OPEN);
  world.rows.push(prompt("apply"), ticks("3.7"));
  for (let i = 0; i < 5; i++)
    expect((await reply($, "Done with 3.7.")).block).toBeDefined();
  expect((await reply($, "Done with 3.7.")).block).toBeUndefined();
  expect(lines.length).toBe(1);
  expect(world.store.get("loopBlocks")).toBe(0);
});

test("a stop with no tick clears the count of blocks", async ($: Engine, on: On) => {
  const world = looped(on);
  world.files.set(PLAN, OPEN);
  world.rows.push(prompt("apply"), ticks("3.7"));
  await reply($, "Done with 3.7.");
  expect(world.store.get("loopBlocks")).toBe(1);
  world.rows.push(prompt("go on"));
  expect((await reply($, "Waiting.")).block).toBeUndefined();
  expect(world.store.get("loopBlocks")).toBe(0);
});

test("a failing `/goal` check keeps priority over the open task", async ($: Engine, on: On) => {
  const world = looped(on, { check: "just check" }, [1]);
  world.files.set(PLAN, OPEN);
  world.rows.push(prompt("apply"), ticks("3.7"));
  expect((await reply($, "Done with 3.7.")).block).toContain("just check");
  expect(world.store.get("loopBlocks") ?? 0).toBe(0);
});

test("Incident 45: a reply that stops after task 3.7 and plans 3.8 to 3.11 is blocked", async ($: Engine, on: On) => {
  const world = looped(on);
  world.files.set(PLAN, "- [x] 3.7 Do it\n- [ ] 3.8 Setup\n- [ ] 3.11 Group\n");
  world.rows.push(prompt("apply"), ticks("3.7"), answered());
  const out = await reply(
    $,
    "Next is task `3.8`: setup finds each OpenSpec install and removes it, tested against stubbed package managers. Then I go on through `3.11` and run the group 3 `just docker check`.",
  );
  expect(out.block).toContain("3.8");
});

test("Tick Outside Apply: a tick with open boxes and no `/claudetto:apply` row gives no block", async ($: Engine, on: On) => {
  const world = looped(on);
  world.files.set(PLAN, OPEN);
  world.rows.length = 0;
  world.rows.push(prompt("tick 3.7 by hand"), ticks("3.7"), answered());
  expect((await reply($, "Done with 3.7.")).block).toBeUndefined();
  expect(world.store.get("loopBlocks") ?? 0).toBe(0);
});

test("a `Skill` call of `claudetto:apply` counts as an apply session", async ($: Engine, on: On) => {
  const world = looped(on);
  world.files.set(PLAN, OPEN);
  world.rows.length = 0;
  world.rows.push(
    prompt("start the work"),
    {
      role: "assistant",
      text: "",
      handle: "h",
      toolUses: [
        {
          tool_use_id: "s1",
          tool: "Skill",
          input: { skill: "claudetto:apply" },
          text: "ok",
        },
      ] as never,
    },
    ticks("3.7"),
    answered(),
  );
  expect((await reply($, "Done with 3.7.")).block).toContain("3.8");
});

test("Subagent Running: no block while an agent is `pending`, `running`, or `waiting`", async ($: Engine, on: On) => {
  const world = looped(on);
  world.files.set(PLAN, OPEN);
  world.rows.push(prompt("go on"), ticks("3.7"), answered());
  for (const status of ["pending", "running", "waiting"]) {
    world.agents.length = 0;
    world.agents.push(status);
    expect((await reply($, "Done with 3.7.")).block).toBeUndefined();
  }
  expect(world.store.get("loopBlocks") ?? 0).toBe(0);
  world.agents.length = 0;
  world.agents.push("idle", "completed", "failed", "killed");
  expect((await reply($, "Done with 3.7.")).block).toContain("3.8");
});

test("a failing `$.agent.list()` adds no block, and the stop goes on", async ($: Engine, on: On) => {
  const world = looped(on);
  world.files.set(PLAN, OPEN);
  world.rows.push(prompt("go on"), ticks("3.7"), answered());
  world.agent.down = true;
  expect((await reply($, "Done with 3.7.")).block).toBeUndefined();
  expect(world.store.get("loopBlocks") ?? 0).toBe(0);
});
