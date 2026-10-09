// The eval arm of each eval-gated item of setup (task 6.4): the dotclaude arm plus the one item.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { GATED } from "../../plugins/dotclaude/features/setup/gated.mjs";
import { armPlan, armSettings, GATED_ARMS } from "../../tools/eval/arms.mjs";

const PROFILE = JSON.parse(
  fs.readFileSync(
    path.join(
      import.meta.dirname,
      "../../plugins/dotclaude/features/setup/profile.json",
    ),
    "utf8",
  ),
);

test("each gated item has one arm that installs the plugin like the dotclaude arm", () => {
  expect(GATED_ARMS).toEqual(Object.keys(GATED).map((n) => `gated-${n}`));
  const base = armPlan("dotclaude", { model: "m" }).setup;
  for (const arm of GATED_ARMS)
    expect(armPlan(arm, { model: "m" }).setup).toEqual(base);
});

test("the subagent cache arm sets `subagentPromptCacheTtl` to `1h`, and the profile does not", () => {
  expect(PROFILE.subagentPromptCacheTtl).toBeUndefined();
  const s = armSettings("gated-subagent-cache-1h", {}, PROFILE);
  expect(s.subagentPromptCacheTtl).toBe("1h");
  expect(armSettings("dotclaude", {}, PROFILE).subagentPromptCacheTtl).toBe(
    undefined,
  );
});

test("each gated arm adds only its item and keeps the hook", () => {
  const s = armSettings("gated-telemetry", { hooks: 1 }, PROFILE);
  expect(s.env.DISABLE_TELEMETRY).toBe("1");
  expect(s.hooks).toBe(1);
  expect(s.permissions).toEqual(PROFILE.permissions);
  const t = armSettings("gated-nonessential-traffic", {}, PROFILE);
  expect(t.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe("1");
  expect(PROFILE.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBeUndefined();
});
