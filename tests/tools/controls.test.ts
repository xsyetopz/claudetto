// Behavior of the `controls` rule of `just validate` (D27) and of the generated page `wiki/rationale/Controls.md`.

import { expect, test } from "bun:test";
import type { FoundPlugin } from "../../tools/generate/discover.ts";
import { controlsOf } from "../../tools/generate/emit/controls.ts";
import { missingControls } from "../../tools/parts.ts";

const found = (name: string, slice: object): FoundPlugin["slices"][number] =>
  ({
    name,
    dir: `src/plugins/p/slices/${name}`,
    slice: { name, ladder: "none: x", ...slice },
    mod: {},
  }) as FoundPlugin["slices"][number];

const control = { name: "c", incident: "i.", removeWhen: "r." };
const hook = { event: "tool.call", phase: "check", run: () => {} };

const plugins = (...slices: FoundPlugin["slices"]): FoundPlugin[] => [
  { name: "p", slices },
];

test("a slice with a mod handler or a classic hook and no `controls` fails", () => {
  const got = missingControls(
    plugins(
      found("a", { mod: [hook] }),
      found("b", { hooks: [{ event: "Stop", command: "x" }] }),
      found("c", { mod: [hook], controls: [] }),
    ),
  );
  expect(got).toEqual([
    "src/plugins/p/slices/a: registers a hook and has no `controls` record in `slice.ts`",
    "src/plugins/p/slices/b: registers a hook and has no `controls` record in `slice.ts`",
    "src/plugins/p/slices/c: registers a hook and has no `controls` record in `slice.ts`",
  ]);
});

test("a slice with a record, and a slice with no hook, pass", () => {
  expect(
    missingControls(
      plugins(
        found("a", { mod: [hook], controls: [control] }),
        found("b", { skills: ["s"] }),
      ),
    ),
  ).toEqual([]);
});

test("a control with an empty field fails", () => {
  expect(
    missingControls(
      plugins(
        found("a", {
          mod: [hook],
          controls: [{ ...control, removeWhen: " " }],
        }),
      ),
    ),
  ).toEqual([
    "src/plugins/p/slices/a: the control `c` has an empty `incident` or `removeWhen`",
  ]);
});

test("the page has one row for each control, and none without a control", () => {
  const out = controlsOf(
    plugins(found("a", { controls: [control] }), found("b", {})),
  );
  expect(out).toHaveLength(1);
  expect(out[0]?.file).toBe("wiki/rationale/Controls.md");
  expect(out[0]?.text).toContain("| `p/a` | `c` | i. | r. |");
  expect(controlsOf(plugins(found("b", {})))).toEqual([]);
});
