// Tests of the session stamp in `src/kernel/stamp.ts`: the format, the parser, and the text that is not a stamp.

import { expect, test } from "bun:test";
import {
  formatStamp,
  parseStamp,
  SHA_SOURCES,
  type StampRecord,
} from "../../src/kernel/stamp.ts";

const RECORD: StampRecord = {
  version: "1.0.0",
  sha: "0123456",
  shaSource: "install",
  sessionId: "6f1c2a9e-0000-4000-8000-000000000001",
  at: "2026-10-13T10:00:00.000Z",
};

test("`parseStamp` gives back the record that `formatStamp` wrote", () => {
  expect(parseStamp(formatStamp(RECORD))).toStrictEqual(RECORD);
});

test("the record round trips with each source of the SHA", () => {
  for (const shaSource of SHA_SOURCES) {
    const record = { ...RECORD, shaSource };
    expect(parseStamp(formatStamp(record))).toStrictEqual(record);
  }
});

test("the record of the stamp text keeps the JSON fields of the record and no others", () => {
  const text = formatStamp(RECORD);
  expect(JSON.parse(text.slice(text.indexOf("{")))).toStrictEqual(RECORD);
});

test("other text gives `undefined`", () => {
  for (const text of ["", "ok", "the version is 1.0.0", '{"version":"1.0.0"}'])
    expect(parseStamp(text)).toBeUndefined();
});

test("JSON of a record with no prefix gives `undefined`", () => {
  const text = formatStamp(RECORD).slice("dotclaude build stamp: ".length);
  expect(parseStamp(text)).toBeUndefined();
});

test("a prefix with text that is not JSON gives `undefined`", () => {
  expect(parseStamp(`${formatStamp(RECORD).split("{")[0]}{not json`)).toBe(
    undefined,
  );
});

test("a prefix with JSON that is not an object gives `undefined`", () => {
  const prefix = formatStamp(RECORD).split("{")[0] ?? "";
  for (const json of ["null", "42", '"text"', "[]"])
    expect(parseStamp(`${prefix}${json}`)).toBeUndefined();
});

test("a record with an unknown SHA source or a field of the wrong type gives `undefined`", () => {
  const prefix = formatStamp(RECORD).split("{")[0] ?? "";
  const bad = [
    { ...RECORD, shaSource: "npm" },
    { ...RECORD, sha: 1234567 },
    { ...RECORD, version: undefined },
    { ...RECORD, sessionId: null },
    { ...RECORD, at: 0 },
  ];
  for (const record of bad)
    expect(parseStamp(`${prefix}${JSON.stringify(record)}`)).toBeUndefined();
});

test("a value that is not text gives `undefined`", () => {
  expect(parseStamp(undefined)).toBeUndefined();
  expect(parseStamp(RECORD)).toBeUndefined();
});
