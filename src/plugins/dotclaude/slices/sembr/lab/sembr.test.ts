// Lab tests of the `sembr` `tool.call` handlers on `Write`, `Edit`, and `Bash` (design D29, probe 2.29).
// The `Edit` handler repairs a cross-sentence `old_string` and rewrites `new_string`.
// `fs.exists` and `fs.read` are stubbed with the text of the file, and the stub of `tool.call` records the input that reaches the engine.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const SPLIT = "Alpha is first.\nBeta is second.\nGamma is third.\n";
const FUSED = "Alpha is first. Beta is second. Gamma is third.\n";

/** The fields of a call that reach the engine, by tool. */
type Seen = {
  old_string?: string;
  new_string?: string;
  content?: string;
  command?: string;
};

/** `file` is the text that `fs.read` answers, or null to leave the read to the real file system, which has no `notes.md`. */
const engine = (
  on: On,
  { file, seen }: { file: string | null; seen: Seen[] },
) => {
  if (file !== null) {
    on("fs.exists", () => ({ value: true }));
    on("fs.read", () => ({ value: file }));
  }
  on("tool.call", (_$, e) => {
    if (e.tool === "Edit") {
      seen.push({ old_string: e.old_string, new_string: e.new_string });
    } else if (e.tool === "Write") {
      seen.push({ content: e.content });
    } else if (e.tool === "Bash") {
      seen.push({ command: e.command });
    }
    return { result: "ok" };
  });
};

const edit = (
  $: Engine,
  input: { old_string: string; new_string: string; replace_all?: boolean },
) => $.tool.call({ tool: "Edit", file_path: "notes.md", ...input });

test("a cross-sentence `old_string` is split when only its split form is in the file", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: SPLIT, seen });
  await edit($, {
    old_string: "Beta is second. Gamma is third.",
    new_string: "Beta is 2nd. Gamma is 3rd.",
  });
  expect(seen[0]?.old_string).toBe("Beta is second.\nGamma is third.");
  expect(seen[0]?.new_string).toBe("Beta is 2nd.\nGamma is 3rd.");
});

test("an `old_string` that matches as written reaches the engine unchanged", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: SPLIT, seen });
  await edit($, { old_string: "Beta is second.", new_string: "Beta is 2nd." });
  expect(seen[0]?.old_string).toBe("Beta is second.");
  expect(seen[0]?.new_string).toBe("Beta is 2nd.");
});

test("a file written before the hook keeps its fused match", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: FUSED, seen });
  const old = "Beta is second. Gamma is third.";
  await edit($, { old_string: old, new_string: "Beta is 2nd. Gamma is 3rd." });
  expect(seen[0]?.old_string).toBe(old);
  expect(seen[0]?.new_string).toBe("Beta is 2nd. Gamma is 3rd.");
});

const UNRELATED = { old_string: "Zeta. Eta.", new_string: "Three. Four." };

test("a missing file passes on unchanged", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: null, seen });
  await edit($, { old_string: "One. Two.", new_string: "Three. Four." });
  expect(seen[0]?.old_string).toBe("One. Two.");
});

test("an `old_string` that is in the file in neither form passes on unchanged", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: SPLIT, seen });
  await edit($, UNRELATED);
  expect(seen[0]?.old_string).toBe("Zeta. Eta.");
});

test("an `Edit` of another file type passes on unchanged", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: SPLIT, seen });
  await $.tool.call({
    tool: "Edit",
    file_path: "a.txt",
    old_string: "Beta is second. Gamma is third.",
    new_string: "x",
  });
  expect(seen[0]?.old_string).toBe("Beta is second. Gamma is third.");
});

const FUSED_TEXT = "Read the file. Then edit it.";
const SPLIT_TEXT = "Read the file.\nThen edit it.";

test("an `Edit` rewrites a fused `new_string` of whole lines and keeps `old_string`", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: "# T\n\nOld line.\n", seen });
  await edit($, { old_string: "Old line.", new_string: FUSED_TEXT });
  expect(seen[0]?.old_string).toBe("Old line.");
  expect(seen[0]?.new_string).toBe(SPLIT_TEXT);
});

test("an `Edit` of a fragment of a line keeps `new_string`", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: "Start here. More text.\n", seen });
  await edit($, { old_string: "Start", new_string: `${FUSED_TEXT} Also` });
  expect(seen[0]?.new_string).toBe(`${FUSED_TEXT} Also`);
});

const write = ($: Engine, file_path: string, content: string) =>
  $.tool.call({ tool: "Write", file_path, content });

test("a `Write` of a Markdown file gets one sentence on each line", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: null, seen });
  await write($, "notes.md", `# T\n\n${FUSED_TEXT}\n`);
  expect(seen[0]?.content).toBe(`# T\n\n${SPLIT_TEXT}\n`);
});

test("a `Write` of another file type keeps its content", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: null, seen });
  await write($, "notes.txt", FUSED_TEXT);
  expect(seen[0]?.content).toBe(FUSED_TEXT);
});

const bash = ($: Engine, command: string) =>
  $.tool.call({ tool: "Bash", command });
const commit = (body: string) =>
  `git commit -m "$(cat <<'EOF'\n${body}\nEOF\n)"`;

test("a `Bash` commit heredoc is rewritten, with the subject kept", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: null, seen });
  await bash($, commit(`Fix it. Now it works.\n\n${FUSED_TEXT}`));
  expect(seen[0]?.command).toBe(
    commit(`Fix it. Now it works.\n\n${SPLIT_TEXT}`),
  );
});

test("a `Bash` call that is not a quoted heredoc commit passes on unchanged", async ($: Engine, on: On) => {
  const seen: Seen[] = [];
  engine(on, { file: null, seen });
  await bash($, `git commit -m "${FUSED_TEXT}"`);
  expect(seen[0]?.command).toBe(`git commit -m "${FUSED_TEXT}"`);
});
