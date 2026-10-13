// `accept` calls the trace, and refuses a change with an orphan ID, an uncited line, or no base.
// The tests check the exit status and the state, not the wording of a message.

import { describe, expect, test } from "bun:test";
import { commitFile, file, packageIn, phase, write } from "../cli/run-phase.ts";

const EVENTS = ".dotclaude/spec/changes/c1/events.jsonl";

/** A change with `P1` done, and `text` committed in `src/a.ts` after the `implement` event. */
const doneWith = async (text: string): Promise<string> => {
  const root = await packageIn("done");
  commitFile(root, "src/a.ts", text);
  return root;
};

/** Sets `sha` on the `implement` event of `P1`, or removes it, and moves the event times to the future. */
const rebased = async (root: string, sha: string | undefined) => {
  const lines = (await file(root, EVENTS)).trim().split("\n");
  const edited = lines.map((l) => {
    const e = JSON.parse(l);
    if (e.state !== "doing" && e.state !== "implementing") return l;
    return JSON.stringify({ ...e, at: "2999-01-01T00:00:00.000Z", sha });
  });
  await write(root, EVENTS, `${edited.join("\n")}\n`);
};

const status = async (root: string): Promise<string> =>
  /^status: (.*)$/m.exec(
    await file(root, ".dotclaude/spec/changes/c1/change.md"),
  )?.[1] ?? "";

describe("accept and the trace", () => {
  test("an uncited line refuses, and the change stays implementing", async () => {
    const root = await doneWith("run();\n");
    expect((await phase(root, "accept", "c1")).code).toBe(1);
    expect(await status(root)).toBe("implementing");
  });

  test("an orphan ID refuses, and the change stays implementing", async () => {
    const root = await doneWith("run(); // [REQ-99]\n");
    expect((await phase(root, "accept", "c1")).code).toBe(1);
    expect(await status(root)).toBe("implementing");
  });

  test("code after a leading block comment refuses", async () => {
    const root = await doneWith("/* x */ run();\n");
    expect((await phase(root, "accept", "c1")).code).toBe(1);
    expect(await status(root)).toBe("implementing");
  });

  test("a cited line passes", async () => {
    const root = await doneWith("run(); // [REQ-1]\n");
    expect((await phase(root, "accept", "c1")).code).toBe(0);
    expect(await status(root)).toBe("accepted");
  });

  test("a change with no base refuses, and does not pass as clean", async () => {
    const root = await doneWith("run(); // [REQ-1]\n");
    await rebased(root, undefined);
    expect((await phase(root, "accept", "c1")).code).toBe(1);
    expect(await status(root)).toBe("implementing");
  });

  test("a sha that is no commit refuses, and does not crash", async () => {
    const root = await doneWith("run(); // [REQ-1]\n");
    await rebased(root, "0".repeat(40));
    const r = await phase(root, "accept", "c1");
    expect(r.code).toBe(1);
    expect(await status(root)).toBe("implementing");
  });
});
