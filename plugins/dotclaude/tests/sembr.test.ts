// Lab tests of the `tool.call` handler on `Edit` that repairs a cross-sentence `old_string` (design D29, probe 2.29).
// `fs.read` is stubbed with the text of the file, and the stub of `tool.call` records the input that reaches the engine.

import { expect, test } from "claude-code/testing";

const SPLIT = "Alpha is first.\nBeta is second.\nGamma is third.\n";
const FUSED = "Alpha is first. Beta is second. Gamma is third.\n";

/** `file` is the text that `fs.read` answers, or null to leave the read to the real file system, which has no `notes.md`. */
function engine(on, { file, seen }) {
  if (file !== null) on("fs.read", () => ({ value: file }));
  on("tool.call", (_$, e) => {
    seen.push(e);
    return { result: "ok" };
  });
}

const edit = ($, input) =>
  $.tool.call({ tool: "Edit", file_path: "notes.md", ...input });

test("a cross-sentence `old_string` is split when only its split form is in the file", async ($, on) => {
  const seen = [];
  engine(on, { file: SPLIT, seen });
  await edit($, {
    old_string: "Beta is second. Gamma is third.",
    new_string: "Beta is 2nd. Gamma is 3rd.",
  });
  expect(seen[0].old_string).toBe("Beta is second.\nGamma is third.");
  expect(seen[0].new_string).toBe("Beta is 2nd.\nGamma is 3rd.");
});

test("an `old_string` that matches as written reaches the engine unchanged", async ($, on) => {
  const seen = [];
  engine(on, { file: SPLIT, seen });
  await edit($, { old_string: "Beta is second.", new_string: "Beta. Gamma." });
  expect(seen[0].old_string).toBe("Beta is second.");
  expect(seen[0].new_string).toBe("Beta. Gamma.");
});

test("a file written before the hook keeps its fused match", async ($, on) => {
  const seen = [];
  engine(on, { file: FUSED, seen });
  const old = "Beta is second. Gamma is third.";
  await edit($, { old_string: old, new_string: "Beta is 2nd. Gamma is 3rd." });
  expect(seen[0].old_string).toBe(old);
  expect(seen[0].new_string).toBe("Beta is 2nd. Gamma is 3rd.");
});

const UNRELATED = { old_string: "Zeta. Eta.", new_string: "Three. Four." };

test("a missing file passes on unchanged", async ($, on) => {
  const seen = [];
  engine(on, { file: null, seen });
  await edit($, { old_string: "One. Two.", new_string: "Three. Four." });
  expect(seen[0].old_string).toBe("One. Two.");
});

test("an `old_string` that is in the file in neither form passes on unchanged", async ($, on) => {
  const seen = [];
  engine(on, { file: SPLIT, seen });
  await edit($, UNRELATED);
  expect(seen[0].old_string).toBe("Zeta. Eta.");
});

test("an `Edit` of another file type passes on unchanged", async ($, on) => {
  const seen = [];
  engine(on, { file: SPLIT, seen });
  await $.tool.call({
    tool: "Edit",
    file_path: "a.txt",
    old_string: "Beta is second. Gamma is third.",
    new_string: "x",
  });
  expect(seen[0].old_string).toBe("Beta is second. Gamma is third.");
});
