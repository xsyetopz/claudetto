// Tests of the front matter of schema 2: each key of each kind, the writer, and the templates.

import { expect, test } from "bun:test";
import { FRONT_SCHEMA_2 } from "../../../../src/kernel/state-events.ts";
import {
  checkFront,
  FRONT_KEYS,
  FRONT_KINDS,
  FRONT_SIZES,
  type Front,
  type FrontKind,
  parseFront,
  renderFront,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/v2/front.ts";
import { SIZES } from "../../../../src/plugins/dotclaude/slices/spec/limits.ts";
import {
  CHANGE_TRIVIAL_V2,
  CHANGE_V2,
  DESIGN_V2,
  PACKAGE_V2,
  REQUIREMENTS_V2,
  SPEC_V2,
} from "../../../../src/plugins/dotclaude/slices/spec/templates/v2.ts";

const GOOD: Record<FrontKind, Front> = {
  change: {
    schema: FRONT_SCHEMA_2,
    kind: "change",
    id: "c1",
    size: "medium",
    status: "draft",
    verify: "just check",
  },
  requirements: {
    schema: FRONT_SCHEMA_2,
    kind: "requirements",
    capability: "cap",
  },
  design: { schema: FRONT_SCHEMA_2, kind: "design", id: "c1" },
  package: {
    schema: FRONT_SCHEMA_2,
    kind: "package",
    id: "P1",
    title: "A title",
    wave: "1",
    deps: ["P0"],
    owns: ["src/a.ts"],
    satisfies: ["REQ-1"],
    verify: "just check",
    agent: "implementer",
    status: "planned",
  },
  spec: { schema: FRONT_SCHEMA_2, kind: "spec", capability: "cap" },
};

const text = (kind: FrontKind, values: Front) =>
  `${renderFront(kind, values)}\n# Body\n`;
const ok = (kind: FrontKind, values: Front) =>
  checkFront(text(kind, values), kind).ok;

test("a file of each kind with all its keys passes", () => {
  for (const kind of FRONT_KINDS)
    expect(ok(kind, GOOD[kind] as Front)).toBe(true);
});

test("the keys of each kind are the keys of the Files table", () => {
  expect(FRONT_KEYS.change).toEqual([
    "schema",
    "kind",
    "id",
    "size",
    "status",
    "verify",
  ]);
  expect(FRONT_KEYS.requirements).toEqual(["schema", "kind", "capability"]);
  expect(FRONT_KEYS.design).toEqual(["schema", "kind", "id"]);
  expect(FRONT_KEYS.spec).toEqual(["schema", "kind", "capability"]);
  expect(FRONT_KEYS.package).toEqual([
    "schema",
    "kind",
    "id",
    "title",
    "wave",
    "deps",
    "owns",
    "satisfies",
    "verify",
    "agent",
    "status",
  ]);
});

test("a missing key fails, for each key of each kind", () => {
  for (const kind of FRONT_KINDS)
    for (const key of FRONT_KEYS[kind]) {
      const lines = renderFront(kind, GOOD[kind] as Front)
        .split("\n")
        .filter((l) => !l.startsWith(`${key}:`))
        .join("\n");
      expect(checkFront(lines, kind).ok).toBe(false);
    }
});

test("an unknown key fails", () => {
  const withExtra = renderFront("spec", GOOD.spec as Front).replace(
    "---\n\n",
    "",
  );
  const body = withExtra.replace(/---\n$/, "extra: x\n---\n");
  expect(checkFront(body, "spec").ok).toBe(false);
});

test("a wrong schema or a wrong kind fails", () => {
  expect(
    ok("spec", { ...(GOOD.spec as Front), schema: "dotclaude-spec/1" }),
  ).toBe(false);
  expect(checkFront(text("spec", GOOD.spec as Front), "design").ok).toBe(false);
});

test("a package status must be a package state", () => {
  expect(ok("package", { ...(GOOD.package as Front), status: "doing" })).toBe(
    true,
  );
  expect(ok("package", { ...(GOOD.package as Front), status: "review" })).toBe(
    false,
  );
  expect(ok("package", { ...(GOOD.package as Front), status: "draft" })).toBe(
    false,
  );
});

test("a change status must be a change state, and its size one of the sizes", () => {
  expect(
    ok("change", { ...(GOOD.change as Front), status: "implementing" }),
  ).toBe(true);
  expect(ok("change", { ...(GOOD.change as Front), status: "doing" })).toBe(
    false,
  );
  for (const size of SIZES)
    expect(ok("change", { ...(GOOD.change as Front), size })).toBe(true);
  expect(ok("change", { ...(GOOD.change as Front), size: "huge" })).toBe(false);
});

test("the size list equals the SIZES bound of the slice", () => {
  expect([...FRONT_SIZES]).toEqual([...SIZES]);
});

test("a wave is a whole number", () => {
  for (const wave of ["0", "3", "12"])
    expect(ok("package", { ...(GOOD.package as Front), wave })).toBe(true);
  for (const wave of ["x", "1.5", "-1", ""])
    expect(ok("package", { ...(GOOD.package as Front), wave })).toBe(false);
});

test("deps, owns, and satisfies must be lists and the other keys strings", () => {
  for (const key of ["deps", "owns", "satisfies"])
    expect(ok("package", { ...(GOOD.package as Front), [key]: "P1" })).toBe(
      false,
    );
  expect(ok("package", { ...(GOOD.package as Front), title: ["a"] })).toBe(
    false,
  );
});

test("a file with no front matter fails", () => {
  expect(checkFront("# Title\n", "spec").ok).toBe(false);
});

test("a repeated key and a bad JSON value fail", () => {
  expect(parseFront("---\nkind: spec\nkind: spec\n---\n").ok).toBe(false);
  expect(parseFront('---\ndeps: ["a"\n---\n').ok).toBe(false);
});

test("a title with a colon, a quote, or a bracket round-trips", () => {
  for (const title of ["a: b", '"quoted"', "[x] y"]) {
    const values = { ...(GOOD.package as Front), title };
    const parsed = parseFront(text("package", values));
    expect(parsed.ok && parsed.value.front["title"]).toBe(title);
  }
});

test("the writer refuses a missing key", () => {
  expect(() =>
    renderFront("spec", { schema: FRONT_SCHEMA_2, kind: "spec" }),
  ).toThrow();
});

test("each template passes the check of its kind", () => {
  const cases: [string, FrontKind][] = [
    [CHANGE_V2, "change"],
    [CHANGE_TRIVIAL_V2, "change"],
    [REQUIREMENTS_V2, "requirements"],
    [DESIGN_V2, "design"],
    [PACKAGE_V2, "package"],
    [SPEC_V2, "spec"],
  ];
  for (const [template, kind] of cases) {
    const filled = template.replace("<size>", "medium");
    expect(checkFront(filled, kind).ok).toBe(true);
  }
});
