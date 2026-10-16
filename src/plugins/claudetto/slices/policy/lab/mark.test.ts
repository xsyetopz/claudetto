// Lab tests of the `policy` slice: the marker of a `Bash` call of Claude, the blank of the GitHub tokens, and the organizations that the user owns.
// The stub of `env.set` keeps the env vars, and the stub of each built-in tool copies them, so a test sees the env of the command while it runs.
// The commands are strings for the guard. No test runs one.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { BLANK_TOKEN } from "../adapters/mark.ts";
import {
  bash,
  denyOf,
  option,
  POLICY,
  push,
  record,
  stub,
  type World,
  world,
} from "./world.ts";

const STORE = "/home/me/.claudetto/policy";
const MARK = "CLAUDETTO_AGENT_CALL" as const;
const WELCOME = "AI tools are welcome in this project.";
const TOKENS = { GH_TOKEN: "gh-real", GITHUB_TOKEN: "github-real" };

/** A world with the given extra fields, and the lists that the stubs fill. */
const watched = (base: World, extra: Partial<World> = {}) => ({
  ...base,
  env: { ...TOKENS },
  seen: [] as Record<string, string>[],
  ghEnv: [] as (Record<string, string> | undefined)[],
  ...extra,
});

/** The env vars that the tests read, in the env of the last built-in tool call. */
type Seen = Partial<Record<"GH_TOKEN" | "GITHUB_TOKEN" | typeof MARK, string>>;

const last = (w: { seen: Record<string, string>[] }): Seen =>
  w.seen.at(-1) ?? {};

/** The memberships of the user, as `gh api --slurp` gives them: one array for each page. */
const memberships = (rows: [string, string][]) =>
  JSON.stringify([
    rows.map(([org, role]) => ({
      state: "active",
      role,
      organization: { login: org },
    })),
  ]);

test(
  // biome-ignore lint/plugin: a test name
  "a call of Claude runs with the marker, and the marker is removed after it",
  option(),
  async ($: Engine, on: On) => {
    const w = watched(world("mk1", "me"));
    stub(on, w);
    expect(denyOf(await bash($, "ls"))).toBeUndefined();
    expect(last(w)[MARK]).toBe("1");
    await $.tool.call({ tool: "Read", file_path: "/work/mk1/AGENTS.md" });
    expect(last(w)[MARK]).toBeUndefined();
  },
);

test(
  "with the option off, a call of Claude has no marker",
  option(false),
  async ($: Engine, on: On) => {
    const w = watched(world("mk2", "me"));
    stub(on, w);
    await bash($, "ls");
    expect(last(w)[MARK]).toBeUndefined();
  },
);

test(
  "a denied call does not run, so it is not marked",
  option(),
  async ($: Engine, on: On) => {
    const w = watched(world("mk3"));
    stub(on, w);
    expect(denyOf(await push($, "/work/mk3"))).toBeDefined();
    expect(w.seen).toEqual([]);
  },
);

test(
  "a command that sets or removes the marker is denied",
  option(),
  async ($: Engine, on: On) => {
    const w = watched(world("mk4", "me"));
    stub(on, w);
    for (const command of [
      `${MARK}= ./x.sh`,
      `unset ${MARK}; make`,
      `env -u ${MARK} sh x`,
      `export ${MARK}=`,
      `bash -c 'export ${MARK}=; ./x.sh'`,
    ]) {
      expect(denyOf(await bash($, command))).toContain(MARK);
    }
    expect(w.seen).toEqual([]);
    expect(denyOf(await bash($, "env -i ls"))).toBeUndefined();
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a script in a closed checkout runs with blank GitHub tokens, and the tokens come back after it",
  option(),
  async ($: Engine, on: On) => {
    const w = watched(world("bl1"));
    stub(on, w);
    expect(denyOf(await bash($, "./build.sh"))).toBeUndefined();
    expect(last(w).GH_TOKEN).toBe(BLANK_TOKEN);
    expect(last(w).GITHUB_TOKEN).toBe(BLANK_TOKEN);
    await bash($, "ls");
    expect(last(w).GH_TOKEN).toBe(TOKENS.GH_TOKEN);
    expect(last(w).GITHUB_TOKEN).toBe(TOKENS.GITHUB_TOKEN);
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a script after a cd into a closed checkout runs with blank GitHub tokens",
  option(),
  async ($: Engine, on: On) => {
    const w = watched(world("bl2"), { cwd: "/tmp" });
    stub(on, w);
    await bash($, "cd /work/bl2 && make");
    expect(last(w).GH_TOKEN).toBe(BLANK_TOKEN);
  },
);

test(
  "a forbidden verdict blanks the tokens for a script",
  option(),
  async ($: Engine, on: On) => {
    const w = watched(world("bl3", "them", POLICY));
    stub(on, w);
    await push($, "/work/bl3");
    await record($, {
      repo: "github.com/them/bl3",
      verdict: "forbidden",
      quote: POLICY,
      read: ["/work/bl3/AGENTS.md"],
    });
    expect(denyOf(await bash($, "npm test"))).toBeUndefined();
    expect(last(w).GH_TOKEN).toBe(BLANK_TOKEN);
  },
);

test(
  "an allowed verdict keeps the tokens for a script",
  option(),
  async ($: Engine, on: On) => {
    const w = watched(world("bl7", "them", WELCOME));
    stub(on, w);
    await push($, "/work/bl7");
    await record($, {
      repo: "github.com/them/bl7",
      verdict: "allowed",
      quote: WELCOME,
      read: ["/work/bl7/AGENTS.md"],
    });
    expect(denyOf(await bash($, "npm test"))).toBeUndefined();
    expect(last(w).GH_TOKEN).toBe(TOKENS.GH_TOKEN);
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "the tokens stay for the user's own repository and for a known command",
  option(),
  async ($: Engine, on: On) => {
    const mine = world("bl4", "me");
    const theirs = world("bl5");
    const w = watched(mine, {
      repos: { ...mine.repos, ...theirs.repos },
      files: { ...mine.files, ...theirs.files },
    });
    stub(on, w);
    await bash($, "cd /work/bl4 && ./build.sh");
    expect(last(w).GH_TOKEN).toBe(TOKENS.GH_TOKEN);
    await bash($, "cd /work/bl5 && gh pr view 1");
    expect(last(w).GH_TOKEN).toBe(TOKENS.GH_TOKEN);
    await bash($, "cd /work/bl5 && ./build.sh");
    expect(last(w).GH_TOKEN).toBe(BLANK_TOKEN);
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a gh call of the slice in a blank window gets the saved token",
  option(),
  async ($: Engine, on: On) => {
    const w = watched(world("bl6"));
    let inner = false;
    w.during = async () => {
      if (inner) return;
      inner = true;
      await bash($, "./inner.sh");
    };
    stub(on, w);
    await bash($, "./outer.sh");
    expect(inner).toBe(true);
    expect(w.ghEnv).toContainEqual({
      GH_TOKEN: TOKENS.GH_TOKEN,
      GITHUB_TOKEN: TOKENS.GITHUB_TOKEN,
    });
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a push to an organization that the user owns needs no verdict",
  option(),
  async ($: Engine, on: On) => {
    stub(
      on,
      watched(world("og1", "acme"), {
        orgs: memberships([
          ["Acme", "admin"],
          ["other", "member"],
        ]),
      }),
    );
    expect(denyOf(await push($, "/work/og1"))).toBeUndefined();
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a push to an organization where the user is only a member needs a verdict",
  option(),
  async ($: Engine, on: On) => {
    stub(
      on,
      watched(world("og2", "other"), {
        orgs: memberships([["other", "member"]]),
      }),
    );
    expect(denyOf(await push($, "/work/og2"))).toContain("ai_policy");
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a failed lookup of the organizations makes each organization external",
  option(),
  async ($: Engine, on: On) => {
    stub(on, watched(world("og3", "acme")));
    expect(denyOf(await push($, "/work/og3"))).toContain("ai_policy");
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "session start writes the owned organizations where the hook reads them",
  option(),
  async ($: Engine, on: On) => {
    const disk = stub(
      on,
      watched(world("og4", "me"), {
        orgs: memberships([
          ["Acme", "admin"],
          ["other", "member"],
        ]),
      }),
    );
    on("session.start", (_$, e) => ({ cwd: e.cwd }));
    on("tool.register", () => ({
      value: { tool: "mcp__claudetto__ai_policy" },
    }));
    await $.session.start({
      cwd: "/work/og4",
      surface: null,
      isInteractive: false,
    });
    expect(disk[`${STORE}/orgs`]?.split("\n").filter(Boolean)).toEqual([
      "acme",
    ]);
  },
);
