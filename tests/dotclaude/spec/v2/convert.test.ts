// Tests of the conversion of a schema 1 change folder to schema 2, on a fixture with one package for each lane.

import { expect, test } from "bun:test";
import type { LaneEvent } from "../../../../src/kernel/spec-store.ts";
import {
  readStateEvents,
  type StateEvent,
} from "../../../../src/kernel/state-events.ts";
import { parsePackage } from "../../../../src/plugins/dotclaude/slices/spec/domain/plan.ts";
import { convertChange } from "../../../../src/plugins/dotclaude/slices/spec/domain/v2/convert.ts";
import { checkFront } from "../../../../src/plugins/dotclaude/slices/spec/domain/v2/front.ts";

const brief = (id: string, title: string) => `---
id: ${id}
deps: []
owns: ["src/${id}.ts"]
verify: just test
agent: implementer
---

# ${id} ${title}

## Goal

Goal text.

## Context

Context text.

## Steps

1. Step.

## Acceptance

- Check.

## Boundaries

- None.
`;

const IDS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"];

const PACKAGES_MD = `# packages

## Wave 0: main session

- [x] P1 First.

## Wave 2: slices

- [ ] P2 Second.
  Owns: \`src/P2.ts\`.
- [ ] P3 Third.
- [ ] P4 Fourth.
- [ ] P5 Fifth.
- [ ] P6 Sixth.
- [ ] P7 Seventh.
- [ ] P8 Eighth.
- [ ] P9 Ninth.
`;

let tick = 0;
const line = (
  pkg: string,
  lane: LaneEvent["lane"],
  extra: Partial<LaneEvent> = {},
): LaneEvent => ({
  at: `2026-01-01T00:00:${String(tick++).padStart(2, "0")}.000Z`,
  package: pkg,
  lane,
  ...extra,
});

/** The schema 1 log: P1 none, P2 doing, P3 review, P4 approved, P5 rejected then review, P6 done, P7 blocked, P8 canceled, P9 approve on a `doing` line. */
const OLD_EVENTS: LaneEvent[] = [
  line("P2", "doing"),
  line("P3", "doing"),
  line("P3", "review"),
  line("P4", "doing"),
  line("P4", "review"),
  line("P4", "review", { verdict: "approve" }),
  line("P5", "doing"),
  line("P5", "review"),
  line("P5", "doing", { verdict: "reject", findings: ["bug one", "bug two"] }),
  line("P5", "review"),
  line("P6", "doing"),
  line("P6", "review"),
  line("P6", "done"),
  line("P7", "blocked", { note: "waits" }),
  line("P8", "canceled", { note: "not needed" }),
  line("P9", "doing", { verdict: "approve" }),
];

const EXPECTED: Record<string, string> = {
  P1: "planned",
  P2: "doing",
  P3: "verified",
  P4: "approved",
  P5: "verified",
  P6: "done",
  P7: "blocked",
  P8: "canceled",
  P9: "approved",
};

const folder = (): Record<string, string> => ({
  "change.md": "# 1.0.0\n\n## Why\n\nText.\n",
  "design.md": "# design\n\nText.\n",
  "packages.md": PACKAGES_MD,
  "workflow.md": "# workflow\n",
  "events.jsonl": `${[{ schema: 1 }, ...OLD_EVENTS].map((e) => JSON.stringify(e)).join("\n")}\n`,
  ...Object.fromEntries(
    IDS.map((id) => [
      `packages/${id.slice(1).padStart(2, "0")}-x.md`,
      brief(id, `Title ${id}`),
    ]),
  ),
});

const run = (files = folder()) => convertChange(files, "1.0.0", "just check");

const fileOf = (id: string) => `packages/${id.slice(1).padStart(2, "0")}-x.md`;

const newEvents = async (
  out: ReturnType<typeof run>,
): Promise<readonly StateEvent[]> =>
  (await readStateEvents(
    {
      read: async (f) =>
        f.endsWith("events.jsonl") ? (out.files["events.jsonl"] ?? null) : null,
      list: async () => [],
    },
    "c",
  )) ?? [];

test("the conversion has no failure and removes packages.md", () => {
  const out = run();
  expect(out.failures).toEqual([]);
  expect(out.removed).toEqual(["packages.md"]);
});

test("each package keeps its state in the front matter and in the last event", async () => {
  const out = run();
  const events = await newEvents(out);
  for (const id of IDS) {
    const text = out.files[fileOf(id)] ?? "";
    const checked = checkFront(text, "package");
    expect(checked.ok).toBe(true);
    const front = checked.ok ? checked.value : {};
    expect(front["status"]).toBe(EXPECTED[id] as string);
    const last = events.findLast((e) => e.package === id)?.state ?? "planned";
    expect(last).toBe(EXPECTED[id] as string);
  }
});

test("the package keys come from the brief, packages.md, and the heading", () => {
  const out = run();
  const front = checkFront(out.files[fileOf("P2")] ?? "", "package");
  expect(front.ok && front.value).toMatchObject({
    id: "P2",
    title: "Title P2",
    wave: "2",
    deps: [],
    owns: ["src/P2.ts"],
    satisfies: [],
    verify: "just test",
    agent: "implementer",
  });
  const first = checkFront(out.files[fileOf("P1")] ?? "", "package");
  expect(first.ok && first.value["wave"]).toBe("0");
});

test("the body of a brief is unchanged", () => {
  const out = run();
  const text = out.files[fileOf("P3")] ?? "";
  expect(
    text.endsWith(
      brief("P3", "Title P3").split("---\n").slice(2).join("---\n"),
    ),
  ).toBe(true);
  const old = parsePackage(brief("P3", "Title P3"));
  expect(old.ok).toBe(true);
});

test("a review line with no verdict becomes verified with a note about the missing record", async () => {
  const events = await newEvents(run());
  const verified = events.filter(
    (e) => e.package === "P3" && e.state === "verified",
  );
  expect(verified.length).toBe(1);
  expect(verified[0]?.note).toBeTruthy();
  expect(verified[0]?.sha).toBeUndefined();
  expect(verified[0]?.verify).toBeUndefined();
});

test("an approve becomes an approved event with no verdict key, on any lane", async () => {
  const events = await newEvents(run());
  expect(events.filter((e) => "verdict" in e)).toEqual([]);
  expect(events.filter((e) => e.package === "P4").map((e) => e.state)).toEqual([
    "doing",
    "verified",
    "approved",
  ]);
  expect(events.filter((e) => e.package === "P9").map((e) => e.state)).toEqual([
    "approved",
  ]);
});

test("a reject becomes a doing event with its findings and fix-code", async () => {
  const events = await newEvents(run());
  const p5 = events.filter((e) => e.package === "P5");
  expect(p5.map((e) => e.state)).toEqual([
    "doing",
    "verified",
    "doing",
    "verified",
  ]);
  expect(p5[2]).toMatchObject({
    findings: ["bug one", "bug two"],
    decision: "fix-code",
  });
});

test("a note of a lane line is kept", async () => {
  const events = await newEvents(run());
  expect(events.find((e) => e.package === "P7")).toMatchObject({
    state: "blocked",
    note: "waits",
  });
  expect(events.find((e) => e.package === "P8")).toMatchObject({
    state: "canceled",
    note: "not needed",
  });
});

test("change.md and design.md get the front matter of their kind and keep their text", () => {
  const out = run();
  const change = checkFront(out.files["change.md"] ?? "", "change");
  expect(change.ok && change.value).toMatchObject({
    id: "1.0.0",
    size: "large",
    status: "implementing",
    verify: "just check",
  });
  expect(out.files["change.md"]).toContain("## Why");
  const design = checkFront(out.files["design.md"] ?? "", "design");
  expect(design.ok && design.value["id"]).toBe("1.0.0");
});

test("the status of the change equals its first event, and a change with no events is draft", async () => {
  const events = await newEvents(run());
  expect(events.find((e) => e.package === undefined)?.state).toBe(
    "implementing",
  );
  const files = { ...folder(), "events.jsonl": '{"schema":1}\n' };
  const out = run(files);
  const change = checkFront(out.files["change.md"] ?? "", "change");
  expect(change.ok && change.value["status"]).toBe("draft");
});

test("a change with no design.md is medium, and the other files stay out of the output", () => {
  const files = folder();
  delete files["design.md"];
  const out = run(files);
  const change = checkFront(out.files["change.md"] ?? "", "change");
  expect(change.ok && change.value["size"]).toBe("medium");
  expect(Object.keys(out.files)).not.toContain("workflow.md");
  expect(Object.keys(out.files)).not.toContain("design.md");
});

test("a brief with no wave in packages.md fails and stays out of the output", () => {
  const files = { ...folder(), "packages.md": "# packages\n" };
  const out = run(files);
  expect(out.failures.map((f) => f.file)).toContain(fileOf("P1"));
  expect(out.files[fileOf("P1")]).toBeUndefined();
});

test("a log with another schema fails and no events file is written", () => {
  const out = run({ ...folder(), "events.jsonl": '{"schema":2}\n' });
  expect(out.failures.map((f) => f.file)).toContain("events.jsonl");
  expect(out.files["events.jsonl"]).toBeUndefined();
});

test("a file that has schema 2 front matter already fails", () => {
  const out = run({
    ...folder(),
    "change.md": "---\nschema: dotclaude-spec/2\n---\n# x\n",
  });
  expect(out.failures.map((f) => f.file)).toContain("change.md");
  expect(out.files["change.md"]).toBeUndefined();
});

test("a torn last line of the old log is skipped", async () => {
  const files = folder();
  files["events.jsonl"] = `${files["events.jsonl"]}{"at":"2026`;
  const out = run(files);
  expect(out.failures).toEqual([]);
  expect((await newEvents(out)).length).toBeGreaterThan(0);
});

test("the converted log passes the schema 2 reader", async () => {
  const events = await newEvents(run());
  expect(events.length).toBe(OLD_EVENTS.length + 1);
});
