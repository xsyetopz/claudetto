// The verdict record, the hash, the quote check, and the input check (`domain/verdict.ts`).

import { expect, test } from "bun:test";
import {
  fileOf,
  hashOf,
  parseInput,
  parseRecord,
  quoteIn,
  type Stored,
} from "../../../src/plugins/claudetto/slices/policy/domain/verdict.ts";
import { QUOTE_MIN_CHARS } from "../../../src/plugins/claudetto/slices/policy/limits.ts";

test("`hashOf` ignores the order of the files and sees a change of a text", () => {
  const a = { name: "a", text: "one" };
  const b = { name: "b", text: "two" };
  expect(hashOf([a, b])).toBe(hashOf([b, a]));
  expect(hashOf([a, b])).not.toBe(hashOf([a, { ...b, text: "twp" }]));
});

test("`quoteIn` finds a quote after white space is normalized", () => {
  expect(
    quoteIn("an LLM  is\nnot welcome", ["Use of an LLM is not welcome here."]),
  ).toBe(true);
  expect(
    quoteIn("another sentence here", ["Use of an LLM is not welcome here."]),
  ).toBe(false);
});

test("`quoteIn` refuses a quote shorter than the minimum", () => {
  const short = "a".repeat(QUOTE_MIN_CHARS - 1);
  expect(quoteIn(short, [short])).toBe(false);
});

test("`parseInput` names the first wrong field", () => {
  expect(parseInput({ verdict: "allowed", read: [] })).toEqual({
    ok: false,
    field: "repo",
  });
  expect(parseInput({ repo: "r", verdict: "maybe", read: [] })).toEqual({
    ok: false,
    field: "verdict",
  });
  expect(parseInput({ repo: "r", verdict: "allowed", read: [1] })).toEqual({
    ok: false,
    field: "read",
  });
  expect(parseInput({ repo: "r", verdict: "silent", read: [] }).ok).toBe(true);
});

test("`parseRecord` reads a stored record and refuses other text", () => {
  const record: Stored = {
    repo: "r",
    hash: "h",
    verdict: "forbidden",
    quote: "q",
    conditions: "",
    time: 1,
  };
  expect(parseRecord(JSON.stringify(record))).toEqual(record);
  expect(parseRecord("not json")).toBeUndefined();
  expect(
    parseRecord(JSON.stringify({ ...record, verdict: "maybe" })),
  ).toBeUndefined();
});

test("`fileOf` makes a safe file name from a key", () => {
  expect(fileOf("/h", "github.com/them/app")).toBe(
    "/h/.claudetto/policy/github.com_them_app.json",
  );
});
