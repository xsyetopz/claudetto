// The delete-refspec rule of `git push` (task 4.1 of `0-2-0`) with commands as strings.
// No command runs.

import { expect, test } from "bun:test";
import { deleteRefspec } from "../../../plugins/claudetto/slices/guard/domain/refspec.ts";
import corpus from "./corpus/refspec.json" with { type: "json" };

test("each delete-refspec push of the corpus is found", () => {
  expect(
    corpus.match.filter((command) => deleteRefspec(command) === null),
  ).toStrictEqual([]);
});

test("no safe form of the corpus is found", () => {
  expect(
    corpus.pass.filter((command) => deleteRefspec(command) !== null),
  ).toStrictEqual([]);
});

test("the rule gives the ref without the colon", () => {
  expect(deleteRefspec("git push origin :br")).toBe("br");
  expect(deleteRefspec("git push origin :refs/heads/x")).toBe("refs/heads/x");
});
