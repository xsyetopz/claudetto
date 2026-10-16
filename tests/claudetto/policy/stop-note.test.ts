// The note that offers `/claudetto:setup sandbox` after Claude records a verdict that does not clear a checkout.

import { expect, test } from "bun:test";
import { stopNoteOf } from "../../../plugins/claudetto/slices/policy/domain/stop-note.ts";

const TARGET = {
  key: "github.com/upstream/tool",
  root: "/work/tool",
  own: false,
};
const STOP = {
  sandbox: {
    enabled: true,
    network: { deniedDomains: ["github.com", "*.github.com"] },
  },
};

test("a `silent` or `forbidden` verdict of a checkout with no hard stop gets the note", () => {
  for (const verdict of ["silent", "forbidden"])
    expect(stopNoteOf(verdict, TARGET, {})).toContain(
      "`/claudetto:setup sandbox`",
    );
});

test("an `allowed` or `conditions` verdict gets no note", () => {
  for (const verdict of ["allowed", "conditions"])
    expect(stopNoteOf(verdict, TARGET, {})).toBe("");
});

test("a checkout that already has the hard stop gets no note", () => {
  expect(stopNoteOf("silent", TARGET, STOP)).toBe("");
});

test("a repository with no checkout on this disk gets no note", () => {
  expect(stopNoteOf("silent", { ...TARGET, root: undefined }, {})).toBe("");
});

test("a sandbox that is off does not count as the hard stop", () => {
  const off = { sandbox: { ...STOP.sandbox, enabled: false } };
  expect(stopNoteOf("forbidden", TARGET, off)).not.toBe("");
});
