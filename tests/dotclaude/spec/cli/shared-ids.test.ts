// `validate` reports a package ID only when two changes have it as an open package, the case where `changeOf` fails.

import { describe, expect, test } from "bun:test";
import {
  CHANGES,
  changeText,
  logText,
  makeChange,
  packageText,
  run,
} from "./read-fixture.ts";

/** A store where `c1` has `P1` in `first` and `c2` has `P1` in `second`. Both changes are `implementing`. */
const two = (first: string, second: string): Promise<string> =>
  makeChange([{ id: "P1", state: first }], {
    files: {
      [`${CHANGES}/c2/change.md`]: changeText("c2", "implementing"),
      [`${CHANGES}/c2/events.jsonl`]: logText("implementing", [
        { id: "P1", state: second },
      ]),
      [`${CHANGES}/c2/packages/P1.md`]: packageText({
        id: "P1",
        state: second,
      }),
    },
  });

describe("validate and a package ID that two changes share", () => {
  test.each([
    ["done", "doing"],
    ["canceled", "planned"],
    ["done", "done"],
  ])("is valid when one package is %s and the other is %s", async (a, b) => {
    const r = await run(await two(a, b), "validate");
    expect(r.err).toEqual([]);
    expect(r.out).toEqual(["Valid."]);
  });

  test.each([
    ["planned", "doing"],
    ["verified", "approved"],
  ])("is reported when the packages are %s and %s", async (a, b) => {
    const r = await run(await two(a, b), "validate");
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toMatch(/P1.*c1, c2/);
  });
});
