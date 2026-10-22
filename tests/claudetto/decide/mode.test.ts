// The `decide` option: it is `jev` by default, and an unknown value is `off`.

import { expect, test } from "bun:test";
import manifest from "../../../plugins/claudetto/.claude-plugin/plugin.json";
import { modeOf } from "../../../plugins/claudetto/slices/decide/domain/request.ts";

test("the default of the `decide` option is `jev`", () => {
  expect(manifest.userConfig.decide.default).toBe("jev");
});

test("`off` turns Jev off, and a missing or unknown value is `off`", () => {
  expect(modeOf({ decide: "off" })).toBe("off");
  expect(modeOf({ decide: "claude" })).toBe("off");
  expect(modeOf({})).toBe("off");
  expect(modeOf({ decide: "jev" })).toBe("jev");
});
