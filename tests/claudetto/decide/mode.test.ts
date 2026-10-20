// The `decide` option: it is `jev` by default, and an unknown value is `off`.

import { expect, test } from "bun:test";
import { modeOf } from "../../../plugins/claudetto/slices/decide/domain/request.ts";
import { TOOL_ASK } from "../../../plugins/claudetto/slices/decide/prompts.ts";
import { slice } from "../../../plugins/claudetto/slices/decide/slice.ts";

test("the default of the `decide` option is `jev`", () => {
  expect(slice.userConfig.decide.default).toBe("jev");
});

test("`off` turns Jev off, and a missing or unknown value is `off`", () => {
  expect(modeOf({ decide: "off" })).toBe("off");
  expect(modeOf({ decide: "claude" })).toBe("off");
  expect(modeOf({})).toBe("off");
  expect(modeOf({ decide: "jev" })).toBe("jev");
});

test("the text of the `AskUserQuestion` tool tells Claude to put the facts in the question", () => {
  expect(TOOL_ASK).toContain("Put the facts that decide the question");
  expect(TOOL_ASK).toContain("cannot read a file");
  expect(TOOL_ASK).toContain("Do not put a secret, a key, or personal data");
});
