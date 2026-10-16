// Lab tests of the claims of a topic about files: the disk must back each claim before the band shows the topic (U7).
// The stubs answer the files and the model call. No model call goes out.

import type { ModelCompleteResult, On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const NO_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

const FLAG = '{"cachedGrowthBookFeatures":{"tengu_jolly_dewdrop":true}}';
const EDIT = { file_path: "/p/a.txt", old_string: "a", new_string: "b" };
const PLUGIN = "claudetto-you-should-know";

/** A file on the disk of a test: its text, or `undefined` for a file that is not there. */
type Disk = Readonly<Record<string, string | undefined>>;

const answer = (topic: string, claims: object[]): ModelCompleteResult => ({
  isAnswered: true,
  text: JSON.stringify({ topic, id: "a-topic", claims }),
  usage: NO_USAGE,
});

/** Stubs for one test: the disk and the answer of the model. */
const setup = (on: On, disk: Disk, reply: ModelCompleteResult) => {
  const seen = { debug: [] as string[] };
  const clock = mock.clock(on);
  mock.env(on, { HOME: "/home/u" });
  on("fs.read", (_$, e) => {
    if (e.path === "/home/u/.claude.json") return { value: FLAG };
    const text = disk[e.path];
    if (text === undefined) throw new Error("ENOENT");
    return { value: text };
  });
  on("fs.stat", (_$, e) => {
    const text = disk[e.path];
    if (text === undefined) throw new Error("ENOENT");
    return {
      value: { kind: "file", size: text.length, mtimeMs: 0, isLink: false },
    };
  });
  on("session.surfaces", () => ({ value: ["terminal"] }));
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("turn.start", (_$, e) => ({ turnId: e.turnId }));
  on("tool.check", () => ({ decision: "allow" as const }));
  on("model.complete", () => ({ value: reply }));
  on("ui.render", ($, e) => $.ui.resolve(e).Box({ children: [] }));
  on("ui.log", (_$, e) => {
    if (e.to === "debug") seen.debug.push(e.text);
    return { value: undefined };
  });
  return { seen, clock };
};

/** Runs one checked edit, and says whether the band shows the topic. */
const shown = async ($: Engine, clock: ReturnType<typeof mock.clock>) => {
  await $.session.start({ cwd: "/p", surface: null, isInteractive: true });
  await $.turn.start({ text: "Hand over.", turnId: "t1" });
  await $.tool.check({ tool: "Edit", input: EDIT, tool_use_id: "toolu_1" });
  for (let i = 0; i < 5; i++) await clock.advance(0);
  const band = await $.ui.mount({
    plugin: PLUGIN,
    surface: "terminal",
    component: "AbovePrompt",
    props: {
      hasSurvey: false,
      isWorking: false,
      maxRows: 20,
      bodyColumns: 80,
      scroll: { offset: 0, bodyRows: 20 },
      view: {},
    },
  });
  const found = await band.find({ type: "Text", text: /You should know/ });
  await band.unmount();
  return found !== undefined;
};

const cut = (path: string) =>
  answer("The handoff file is cut short.", [{ path, state: "cut" }]);

test("a false claim that a whole file is cut short is dropped", async ($: Engine, on: On) => {
  const { seen, clock } = setup(
    on,
    { "/p/handoff.md": "# Handoff\nDone.\n" },
    cut("/p/handoff.md"),
  );
  expect(await shown($, clock)).toBeFalsy();
  expect(seen.debug.join("\n")).toContain("/p/handoff.md");
});

test("a true claim that a file is cut short is shown", async ($: Engine, on: On) => {
  const { clock } = setup(
    on,
    { "/p/handoff.md": "# Handoff\nDon" },
    cut("/p/handoff.md"),
  );
  expect(await shown($, clock)).toBeTruthy();
});

test("a claim that a file is missing needs a missing file", async ($: Engine, on: On) => {
  const claim = answer("The config file is gone.", [
    { path: "/p/c.json", state: "missing" },
  ]);
  const there = setup(on, { "/p/c.json": "{}" }, claim);
  expect(await shown($, there.clock)).toBeFalsy();
});

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("a claim that a file is missing is shown when the disk has no file", async ($: Engine, on: On) => {
  const claim = answer("The config file is gone.", [
    { path: "/p/c.json", state: "missing" },
  ]);
  const { clock } = setup(on, {}, claim);
  expect(await shown($, clock)).toBeTruthy();
});

test("a claim that a file is empty needs a file of no bytes", async ($: Engine, on: On) => {
  const claim = answer("The log is empty.", [
    { path: "/p/l.log", state: "empty" },
  ]);
  const full = setup(on, { "/p/l.log": "x\n" }, claim);
  expect(await shown($, full.clock)).toBeFalsy();
});

test("one false claim among true claims drops the topic", async ($: Engine, on: On) => {
  const claim = answer("Two files are bad.", [
    { path: "/p/a", state: "empty" },
    { path: "/p/b", state: "empty" },
  ]);
  const { clock } = setup(on, { "/p/a": "", "/p/b": "data\n" }, claim);
  expect(await shown($, clock)).toBeFalsy();
});

test("an answer with more claims than the bound is dropped", async ($: Engine, on: On) => {
  const claims = ["a", "b", "c", "d"].map((n) => ({
    path: `/p/${n}`,
    state: "missing",
  }));
  const { clock } = setup(on, {}, answer("Four files are gone.", claims));
  expect(await shown($, clock)).toBeFalsy();
});

test("a topic with no claims is shown with no disk check", async ($: Engine, on: On) => {
  const { clock } = setup(
    on,
    {},
    answer("A retry with no delay can flood the API.", []),
  );
  expect(await shown($, clock)).toBeTruthy();
});
