// The boxes of a `tasks.md`, and what the record and `git status` say about the work of the session.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import {
  agentBusy,
  changedPaths,
  editedPaths,
  ranApply,
  uncommitted,
  unprovenTicks,
} from "../../../../plugins/claudetto/modules/work/finish/domain/record.ts";
import { ticked } from "../../../../plugins/claudetto/modules/work/finish/domain/tasks.ts";

const OPEN = "- [ ] 10.1 Add the test\n- [ ] 10.2 Run `just lab`\n";

test("a box that changes from open to checked is ticked, and an edit of the text is not", () => {
  expect(
    ticked(OPEN, OPEN.replace("[ ] 10.1", "[x] 10.1")).map((t) => t.id),
  ).toEqual(["10.1"]);
  expect(ticked(OPEN, OPEN.replace("Add", "Write"))).toEqual([]);
  expect(ticked("- [x] 1.1 a\n", "- [x] 1.1 b\n")).toEqual([]);
});

const use = (tool: string, input: unknown, isError = false) => ({
  tool_use_id: "t",
  tool,
  input,
  text: "ok",
  isError,
});
const msg = (...toolUses: ReturnType<typeof use>[]): SessionMessage =>
  ({ role: "assistant", text: "", toolUses, handle: "h" }) as SessionMessage;

test("the edited paths are the successful Edit and Write calls", () => {
  const messages = [
    msg(
      use("Edit", { file_path: "/p/a.ts" }),
      use("Write", { file_path: "/p/b.ts" }),
    ),
    msg(
      use("Edit", { file_path: "/p/c.ts" }, true),
      use("Read", { file_path: "/p/d.ts" }),
    ),
  ];
  expect(editedPaths(messages)).toEqual(["/p/a.ts", "/p/b.ts"]);
});

test("`git status -z` gives the paths, and a rename gives the new path only", () => {
  expect(changedPaths(" M a.ts\0?? b/c.ts\0R  new.ts\0old.ts\0")).toEqual([
    "a.ts",
    "b/c.ts",
    "new.ts",
  ]);
  expect(uncommitted(["/p/a.ts", "/p/z.ts"], ["a.ts"])).toEqual(["/p/a.ts"]);
});

test("a tick by an Edit with no passed check is unproven", () => {
  const edit = msg(
    use("Edit", {
      file_path: "/p/tasks.md",
      old_string: "- [ ] 10.1 Add the test",
      new_string: "- [x] 10.1 Add the test",
    }),
  );
  expect(unprovenTicks([edit], [])).toEqual(["10.1"]);
  expect(unprovenTicks([edit], ["just check"])).toEqual([]);
});

const typed = (text: string): SessionMessage => ({
  role: "user",
  text,
  toolUses: [],
});

test("a slash command row of `/claudetto:apply` and a `Skill` call of it are an apply session", () => {
  expect(
    ranApply([
      typed(
        "<command-message>claudetto:apply</command-message>\n<command-name>/claudetto:apply</command-name>",
      ),
    ]),
  ).toBe(true);
  expect(ranApply([msg(use("Skill", { skill: "claudetto:apply" }))])).toBe(
    true,
  );
});

test("another command, another skill, a failed `Skill` call, and a prompt that names the command are no apply session", () => {
  expect(ranApply([])).toBe(false);
  expect(
    ranApply([typed("<command-name>/claudetto:plan</command-name>")]),
  ).toBe(false);
  expect(ranApply([typed("run /claudetto:apply now")])).toBe(false);
  expect(ranApply([msg(use("Skill", { skill: "claudetto:plan" }))])).toBe(
    false,
  );
  expect(
    ranApply([msg(use("Skill", { skill: "claudetto:apply" }, true))]),
  ).toBe(false);
});

test("an agent that is `pending`, `running`, or `waiting` is busy, and an idle or ended one is not", () => {
  const agent = (status: string) => ({ status }) as never;
  for (const status of ["pending", "running", "waiting"])
    expect(agentBusy([agent("idle"), agent(status)])).toBe(true);
  expect(agentBusy(["idle", "completed", "failed", "killed"].map(agent))).toBe(
    false,
  );
  expect(agentBusy([])).toBe(false);
});
