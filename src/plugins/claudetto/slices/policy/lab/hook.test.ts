// Lab tests of the `policy` slice for the `pre-push` hook of git: the files that the hook reads, the one-time consent, and the commands that skip the hook.
// The commands are strings for the guard. No test runs one.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
  bash,
  denyOf,
  option,
  push,
  stub,
  type World,
  world,
} from "./world.ts";

const STORE = "/home/me/.claudetto/policy";

/** A checkout of `owner/name` with no policy file, so that the verdict is recorded as `silent`. */
const quiet = (name: string, owner = "them"): World => ({
  files: { [`/work/${name}/src/a.ts`]: "" },
  repos: {
    [`/work/${name}`]: [
      `/work/${name}`,
      `https://github.com/${owner}/${name}.git`,
    ],
  },
});

const check = ($: Engine, command: string) =>
  $.tool.check({ tool: "Bash", input: { command } } as never);

const tokens = (disk: Record<string, string>) =>
  Object.entries(disk).filter(([k]) => k.startsWith(`${STORE}/consent/`));

const begin = (on: On, w: World) => {
  on("tool.check", () => ({ decision: "allow" }));
  return stub(on, w);
};

test(
  // biome-ignore lint/plugin: a test name
  "a silent push arms one consent token that the next tool call clears",
  option(),
  async ($: Engine, on: On) => {
    const disk = begin(on, quiet("hk1"));
    expect(denyOf(await push($, "/work/hk1"))).toBeUndefined();
    expect(tokens(disk)).toEqual([]);
    expect((await check($, "cd /work/hk1 && git push")).decision).toBe("ask");
    const armed = tokens(disk);
    expect(armed.length).toBe(1);
    expect(armed[0]?.[0]).toContain("github.com_them_hk1");
    expect(armed[0]?.[1]).toBe("1000");
    await bash($, "ls");
    expect(tokens(disk).map(([, v]) => v)).toEqual([""]);
  },
);

test(
  "a push with another verdict and an edit arm no token",
  option(),
  async ($: Engine, on: On) => {
    const disk = begin(on, quiet("hk2"));
    await push($, "/work/hk2");
    await $.tool.check({
      tool: "Edit",
      input: { file_path: "/work/hk2/src/a.ts" },
    } as never);
    await check($, "cd /work/hk2 && make");
    await check($, "cd /work/hk2 && git commit -am x");
    expect(tokens(disk)).toEqual([]);
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "the verdict word and the login are written where the hook reads them",
  option(),
  async ($: Engine, on: On) => {
    const disk = begin(on, quiet("hk3"));
    on("session.start", (_$, e) => ({ cwd: e.cwd }));
    on("tool.register", () => ({
      value: { tool: "mcp__claudetto__ai_policy" },
    }));
    await $.session.start({
      cwd: "/work/hk3",
      surface: null,
      isInteractive: false,
    });
    expect(disk[`${STORE}/login`]).toBe("me");
    await push($, "/work/hk3");
    expect(disk[`${STORE}/flat/github.com_them_hk3`]).toBe("silent");
  },
);

test(
  "a command that skips or changes the push hook is denied",
  option(),
  async ($: Engine, on: On) => {
    begin(on, world("hk4", "me"));
    for (const command of [
      "git push --no-verify",
      "git push --no-ver origin main",
      "git -c core.hooksPath=/dev/null push",
      "git -c hook.claudetto-policy.enabled=false push",
      "GIT_CONFIG_COUNT=0 git push",
      "export GIT_CONFIG_PARAMETERS=x && git push",
      "env -i git push",
      "env -u GIT_CONFIG_COUNT git push",
    ])
      expect(denyOf(await bash($, command)), command).toContain("pre-push");
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a plain push in a repository of the user and other git commands pass",
  option(),
  async ($: Engine, on: On) => {
    begin(on, world("hk5", "me"));
    for (const command of [
      "cd /work/hk5 && git push origin main",
      "git commit --no-verify -m x",
      "env -i ls",
      "GIT_CONFIG_COUNT=0 git status",
    ])
      expect(denyOf(await bash($, command)), command).toBeUndefined();
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a push whose remote cannot be read asks in an external checkout only",
  option(),
  async ($: Engine, on: On) => {
    begin(on, quiet("hk6"));
    const out = await check($, "cd /work/hk6 && git push nosuch");
    expect(out.decision).toBe("ask");
    expect(out.reason).toContain("could not check");
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a push whose remote cannot be read passes in a checkout of the user",
  option(),
  async ($: Engine, on: On) => {
    begin(on, quiet("hk7", "me"));
    const out = await check($, "cd /work/hk7 && git push nosuch");
    expect(out.decision).toBe("allow");
  },
);
