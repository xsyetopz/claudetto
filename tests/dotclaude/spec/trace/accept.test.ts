// `accept` calls the trace, and refuses a change with an orphan ID or an uncited line.

import { describe, expect, test } from "bun:test";
import { commitFile, file, packageIn, phase, write } from "../cli/run-phase.ts";

const EVENTS = ".dotclaude/spec/changes/c1/events.jsonl";

/** A change with `P1` done, and `text` committed in `src/a.ts` after the `implement` event. */
const doneWith = async (text: string): Promise<string> => {
  const root = await packageIn("done");
  const moved = (await file(root, EVENTS)).replaceAll(
    "2026-10-13T10:00:00.000Z",
    "2000-01-01T00:00:00.000Z",
  );
  await write(root, EVENTS, moved);
  commitFile(root, "src/a.ts", text);
  return root;
};

const status = async (root: string): Promise<string> =>
  /^status: (.*)$/m.exec(
    await file(root, ".dotclaude/spec/changes/c1/change.md"),
  )?.[1] ?? "";

describe("accept and the trace", () => {
  test("an uncited line refuses, and the change stays implementing", async () => {
    const root = await doneWith("run();\n");
    const r = await phase(root, "accept", "c1");
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("1 uncited line");
    expect(await status(root)).toBe("implementing");
  });

  test("an orphan ID refuses, and the change stays implementing", async () => {
    const root = await doneWith("run(); // [REQ-99]\n");
    const r = await phase(root, "accept", "c1");
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("1 orphan ID");
    expect(await status(root)).toBe("implementing");
  });

  test("a cited line passes", async () => {
    const root = await doneWith("run(); // [REQ-1]\n");
    expect((await phase(root, "accept", "c1")).code).toBe(0);
    expect(await status(root)).toBe("accepted");
  });
});
