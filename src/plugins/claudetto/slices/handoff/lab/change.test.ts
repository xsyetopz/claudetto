// Lab tests of the handoff with an active openspec change.
// The stubs answer the listing of `openspec/changes/`, the `tasks.md` files, the fork, and the write.
// With an open change, the handoff goes to `handoff.md` in the change folder and names the next open task.
// With no open change, it goes to the default place.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const HANDOFF =
  // biome-ignore lint/plugin: test input data
  "- Read `a.txt` lines 1 to 600: DONE, line 1 is `amber-falcon-42`.\n- Next: read lines 601 to 1200.";

const NO_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

const entry = (name: string, kind: "dir" | "file" = "dir") => ({
  name,
  kind,
  size: 0,
  mtimeMs: 0,
  isLink: false,
});

/** The `tasks.md` text of each change folder by name, and the listing of `openspec/changes/`. */
type World = {
  readonly tasks: Record<string, string>;
  readonly listing?: string[];
};

/** The stubs for `world`. They give the paths of the writes and the texts that the hooks submit. */
const engine = (on: On, world: World) => {
  const seen = {
    writes: [] as { path: string; text: string }[],
    submits: [] as string[],
  };
  on("fs.list", () => ({
    value: (world.listing ?? Object.keys(world.tasks)).map((n) => entry(n)),
  }));
  on("fs.read", (_$, e) => {
    const name = /openspec\/changes\/([^/]+)\/tasks\.md$/.exec(e.path)?.[1];
    const text = name === undefined ? undefined : world.tasks[name];
    if (text === undefined) throw new Error("ENOENT");
    return { value: text };
  });
  on("session.surfaces", () => ({ value: ["terminal"] }));
  on("model.fork", () => ({
    value: { isAnswered: true, text: HANDOFF, usage: NO_USAGE },
  }));
  on("fs.write", (_$, e) => {
    seen.writes.push({ path: e.path, text: e.text });
    return { value: undefined };
  });
  on("fs.stat", () => ({
    value: { kind: "file", size: 100, mtimeMs: 0, isLink: false },
  }));
  on("command.run", () => ({ text: "core" }));
  on("prompt.submit", (_$, e) => {
    seen.submits.push(e.text);
    return { text: e.text };
  });
  on("clock.after", () => ({ value: undefined }));
  on("command.register", (_$, e) => ({ value: { command: e.name } }));
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("tool.register", (_$, e) => ({
    value: { tool: `mcp__claudetto__${e.name}` },
  }));
  on("ui.status", () => ({ value: undefined }));
  on("ui.log", () => ({ value: undefined }));
  return seen;
};

const handedOver = async ($: Engine) => {
  await $.command.run({
    command: "handoff",
    args: "",
    origin: { kind: "composer" },
    presentation: { isFullscreen: false, columns: 80 },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
};

const TASKS =
  // biome-ignore lint/plugin: test input data
  "- [x] 1.1 First\n- [x] 1.2 Second\n- [ ] 1.3 Third\n- [ ] 1.4 Fourth\n";

// biome-ignore lint/plugin: a test name
test("with tasks 1.1 and 1.2 checked, the handoff goes to the change folder and names task 1.3", async ($: Engine, on: On) => {
  const seen = engine(on, { tasks: { "add-export": TASKS } });
  await handedOver($);
  expect(seen.writes).toHaveLength(1);
  const [write] = seen.writes;
  expect(write?.path.endsWith("openspec/changes/add-export/handoff.md")).toBe(
    true,
  );
  expect(write?.text).toContain("`openspec/changes/add-export/`");
  expect(write?.text).toContain("Next open task: `1.3`");
  expect(write?.text).toContain(HANDOFF);
  expect(seen.submits[0]).toContain("openspec/changes/add-export/handoff.md");
  expect(seen.submits[0]).toContain("Next open task: `1.3`");
});

// biome-ignore lint/plugin: a test name
test("a change with all tasks checked and the archive folder are not active, so the handoff goes to the default place", async ($: Engine, on: On) => {
  const seen = engine(on, {
    tasks: { "add-export": "- [x] 1.1 First\n", archive: TASKS },
  });
  await handedOver($);
  expect(seen.writes[0]?.path).toMatch(
    /\.claudetto\/handoffs\/handoff-\d{8}T\d{6}Z\.md$/,
  );
  expect(seen.writes[0]?.text).not.toContain("openspec change");
});

test("a missing change folder gives the default place", async ($: Engine, on: On) => {
  const seen = engine(on, { tasks: {}, listing: [] });
  await handedOver($);
  expect(seen.writes[0]?.path).toMatch(/\.claudetto\/handoffs\//);
});
