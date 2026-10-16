// Tests of `planCommitHook`, the `env` keys of the settings that put the commit check in git.

import { expect, test } from "bun:test";
import { planCommitHook } from "../../../plugins/claudetto/slices/setup/domain/commit-hook.ts";
import type { Change } from "../../../plugins/claudetto/slices/setup/domain/types.ts";
import { HOOK_NAME } from "../../../src/kernel/commit-hook/index.ts";
import {
  AGENT_ENV,
  PUSH_HOOK_NAME,
} from "../../../src/kernel/push-hook/index.ts";

const env = (settings: unknown) =>
  (settings as { env: Record<string, string> }).env;

test("settings with no `env` get a count of 8 and the eight keys of the two hooks", () => {
  const changes: Change[] = [];
  const out = env(planCommitHook({}, changes));
  expect(out["GIT_CONFIG_COUNT"]).toBe("8");
  expect(out["GIT_CONFIG_KEY_0"]).toBe(`hook.${HOOK_NAME}.event`);
  expect(out["GIT_CONFIG_VALUE_0"]).toBe("commit-msg");
  expect(out["GIT_CONFIG_KEY_1"]).toBe(`hook.${HOOK_NAME}.command`);
  expect(out["GIT_CONFIG_VALUE_1"]).toContain("CLAUDE_CODE_SESSION_ID");
  expect(out["GIT_CONFIG_KEY_2"]).toBe(`hook.${HOOK_NAME}.enabled`);
  expect(out["GIT_CONFIG_VALUE_2"]).toBe("true");
  expect(out["GIT_CONFIG_KEY_3"]).toBe("hook.commit-msg.enabled");
  expect(out["GIT_CONFIG_VALUE_3"]).toBe("true");
  expect(out["GIT_CONFIG_KEY_4"]).toBe(`hook.${PUSH_HOOK_NAME}.event`);
  expect(out["GIT_CONFIG_VALUE_4"]).toBe("pre-push");
  expect(out["GIT_CONFIG_KEY_5"]).toBe(`hook.${PUSH_HOOK_NAME}.command`);
  expect(out["GIT_CONFIG_VALUE_5"]).toContain(AGENT_ENV);
  expect(out["GIT_CONFIG_KEY_6"]).toBe(`hook.${PUSH_HOOK_NAME}.enabled`);
  expect(out["GIT_CONFIG_KEY_7"]).toBe("hook.pre-push.enabled");
  expect(changes.some((c) => c.key === "env.GIT_CONFIG_COUNT")).toBe(true);
});

test("the keys of the user stay, and the hook goes after them", () => {
  const user = {
    env: {
      OTHER: "1",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "user.name",
      GIT_CONFIG_VALUE_0: "T",
    },
  };
  const out = env(planCommitHook(user, []));
  expect(out["OTHER"]).toBe("1");
  expect(out["GIT_CONFIG_COUNT"]).toBe("9");
  expect(out["GIT_CONFIG_KEY_0"]).toBe("user.name");
  expect(out["GIT_CONFIG_VALUE_0"]).toBe("T");
  expect(out["GIT_CONFIG_KEY_1"]).toBe(`hook.${HOOK_NAME}.event`);
  expect(out["GIT_CONFIG_KEY_2"]).toBe(`hook.${HOOK_NAME}.command`);
  expect(out["GIT_CONFIG_KEY_3"]).toBe(`hook.${HOOK_NAME}.enabled`);
  expect(out["GIT_CONFIG_KEY_4"]).toBe("hook.commit-msg.enabled");
});

test("a second run changes nothing and gives no change line", () => {
  const once = planCommitHook(
    {
      env: {
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "a.b",
        GIT_CONFIG_VALUE_0: "c",
      },
    },
    [],
  );
  const changes: Change[] = [];
  const twice = planCommitHook(once, changes);
  expect(twice).toEqual(once);
  expect(changes).toEqual([]);
});

test("an old setup with two keys keeps its slots and gets the two `enabled` keys after them", () => {
  const old = {
    env: {
      GIT_CONFIG_COUNT: "2",
      GIT_CONFIG_KEY_0: `hook.${HOOK_NAME}.event`,
      GIT_CONFIG_VALUE_0: "commit-msg",
      GIT_CONFIG_KEY_1: `hook.${HOOK_NAME}.command`,
      GIT_CONFIG_VALUE_1: "old",
    },
  };
  const out = env(planCommitHook(old, []));
  expect(out["GIT_CONFIG_COUNT"]).toBe("8");
  expect(out["GIT_CONFIG_KEY_0"]).toBe(`hook.${HOOK_NAME}.event`);
  expect(out["GIT_CONFIG_VALUE_1"]).toContain("CLAUDE_CODE_SESSION_ID");
  expect(out["GIT_CONFIG_KEY_2"]).toBe(`hook.${HOOK_NAME}.enabled`);
  expect(out["GIT_CONFIG_KEY_3"]).toBe("hook.commit-msg.enabled");
});
