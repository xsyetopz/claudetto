// The `decide` option: it is `jev` by default, and an unknown value is `off`.

import { expect, test } from "bun:test";
import manifest from "../../../plugins/claudetto/.claude-plugin/plugin.json";
import {
  keyOf,
  modeOf,
} from "../../../plugins/claudetto/slices/decide/domain/request.ts";

test("the default of the `decide` option is `jev`", () => {
  expect(manifest.userConfig.decide.default).toBe("jev");
});

test("Key Not in Settings: the option `TYPESAFE_API_KEY` is sensitive, so Claude Code keeps it in secure storage", () => {
  expect(manifest.userConfig.TYPESAFE_API_KEY.sensitive).toBe(true);
  expect(keyOf({ TYPESAFE_API_KEY: "k" })).toBe("k");
  expect(keyOf({ TYPESAFE_API_KEY: 1 })).toBe("");
});

test("`off` turns Jev off, and a missing or unknown value is `off`", () => {
  expect(modeOf({ decide: "off" })).toBe("off");
  expect(modeOf({ decide: "claude" })).toBe("off");
  expect(modeOf({})).toBe("off");
  expect(modeOf({ decide: "jev" })).toBe("jev");
});
