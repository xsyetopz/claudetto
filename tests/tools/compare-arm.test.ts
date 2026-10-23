// The arm `goal-builtin` of `tools/compare-builtins.ts` on the real `hooks/register.ts`: the goal hooks go, and each other hook stays.

import { expect, test } from "bun:test";
import path from "node:path";
import { withoutGoal } from "../../tools/compare/without-goal.ts";
import { PLUGINS } from "../support/repo.ts";

const register = await Bun.file(
  path.join(PLUGINS, "claudetto/hooks/register.ts"),
).text();
const hooks = (text: string) => text.match(/\bon\(/g)?.length ?? 0;

test("`withoutGoal` removes the `/goal` command and the stop of `finish`, and keeps the guard", () => {
  const kept = withoutGoal(register);
  expect(kept).not.toContain('command: "goal"');
  expect(kept).not.toContain("// eval: classic.Stop finish");
  expect(kept).not.toContain('"goal_status"');
  expect(kept).toContain('on("tool.check", h6).catch(h7)');
  expect(kept).toContain('"tool_hosts_notice"');
  expect(hooks(kept)).toBe(hooks(register) - 2);
});
