// Lab tests of the `policy` slice: the AI policy gate for the repositories that are not the user's.
// Each test uses its own repository name, because the module keeps the verdicts and the checkouts it has seen.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
  bash,
  denyOf,
  LOGIN,
  option,
  POLICY,
  push,
  record,
  stub,
  world,
  write,
} from "./world.ts";

test(
  "session start registers the tool `ai_policy`",
  option(),
  async ($: Engine, on: On) => {
    stub(on, world("reg"));
    const specs: Array<Record<string, unknown>> = [];
    on("session.start", (_$, e) => ({ cwd: e.cwd }));
    on("tool.register", (_$, e) => {
      specs.push({ ...e });
      return { value: { tool: `mcp__claudetto__${e.name}` } };
    });
    await $.session.start({
      cwd: "/work/reg",
      surface: null,
      isInteractive: false,
    });
    expect(specs.map((s) => s["name"])).toContain("ai_policy");
  },
);

test(
  "with the option off, session start registers no tool",
  option(false),
  async ($: Engine, on: On) => {
    stub(on, world("off"));
    const specs: Array<Record<string, unknown>> = [];
    on("session.start", (_$, e) => ({ cwd: e.cwd }));
    on("tool.register", (_$, e) => {
      specs.push({ ...e });
      return { value: { tool: `mcp__claudetto__${e.name}` } };
    });
    await $.session.start({
      cwd: "/work/off",
      surface: null,
      isInteractive: false,
    });
    expect(specs.map((s) => s["name"])).not.toContain("ai_policy");
  },
);

test("a repository of the user passes", option(), async ($: Engine, on: On) => {
  stub(on, world("mine", LOGIN));
  expect(denyOf(await push($, "/work/mine"))).toBeUndefined();
});

test(
  "a folder with no repository passes",
  option(),
  async ($: Engine, on: On) => {
    stub(on, { files: {}, repos: {} });
    expect(denyOf(await bash($, "git push"))).toBeUndefined();
  },
);

test(
  "with the option off, a push to another repository passes",
  option(false),
  async ($: Engine, on: On) => {
    stub(on, world("optout"));
    expect(denyOf(await push($, "/work/optout"))).toBeUndefined();
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "the first push to another repository is denied with the list of its policy files",
  option(),
  async ($: Engine, on: On) => {
    stub(on, world("first"));
    const deny = denyOf(await push($, "/work/first"));
    expect(deny).toContain("them/first");
    expect(deny).toContain("/work/first/AGENTS.md");
    expect(deny).toContain("mcp__claudetto__ai_policy");
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "a repository with no policy file is recorded as silent and passes",
  option(),
  async ($: Engine, on: On) => {
    const w = world("quiet");
    w.files = { "/work/quiet/src/a.ts": "" };
    const disk = stub(on, w);
    expect(denyOf(await push($, "/work/quiet"))).toBeUndefined();
    expect(Object.keys(disk).some((k) => k.endsWith("them_quiet.json"))).toBe(
      true,
    );
  },
);

test(
  "a quote that is not in a file is refused",
  option(),
  async ($: Engine, on: On) => {
    stub(on, world("badquote"));
    await push($, "/work/badquote");
    const out = await record($, {
      repo: "github.com/them/badquote",
      verdict: "allowed",
      quote: "AI tools are welcome here",
      read: ["/work/badquote/AGENTS.md"],
    });
    expect(String("result" in out ? out.result : "")).not.toContain("recorded");
    expect(denyOf(await push($, "/work/badquote"))).toBeDefined();
  },
);

test(
  "a verdict that leaves a policy file out of read is refused",
  option(),
  async ($: Engine, on: On) => {
    stub(on, world("unread"));
    await push($, "/work/unread");
    await record($, {
      repo: "github.com/them/unread",
      verdict: "forbidden",
      quote: POLICY,
      read: [],
    });
    expect(denyOf(await push($, "/work/unread"))).toContain("AGENTS.md");
  },
);

test(
  "a verdict with a quote from a file is stored",
  option(),
  async ($: Engine, on: On) => {
    const disk = stub(on, world("stored"));
    await push($, "/work/stored");
    await record($, {
      repo: "github.com/them/stored",
      verdict: "allowed",
      quote: "Contributions made with an LLM",
      read: ["/work/stored/AGENTS.md"],
    });
    const file = Object.keys(disk).find((k) => k.endsWith("them_stored.json"));
    expect(JSON.parse(disk[file ?? ""] ?? "{}")).toMatchObject({
      verdict: "allowed",
    });
    expect(denyOf(await push($, "/work/stored"))).toBeUndefined();
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "a forbidden verdict denies a push, a GitHub write, and an MCP write",
  option(),
  async ($: Engine, on: On) => {
    stub(on, world("closed"));
    await push($, "/work/closed");
    await record($, {
      repo: "github.com/them/closed",
      verdict: "forbidden",
      quote: POLICY,
      read: ["/work/closed/AGENTS.md"],
    });
    const cd = "cd /work/closed &&";
    for (const out of [
      await bash($, `${cd} git push origin main`),
      await push($, "/work/closed", "--force"),
      await bash($, `${cd} gh pr create --fill`),
      await bash($, "gh issue comment 3 -R them/closed -b hi"),
      await bash($, "gh api -X POST repos/them/closed/issues -f title=x"),
      await $.tool.call({
        tool: "mcp__github__create_pull_request",
        owner: "them",
        repo: "closed",
      }),
    ])
      expect(denyOf(out)).toContain("forbids");
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a forbidden verdict does not stop an edit, a commit, or a build",
  option(),
  async ($: Engine, on: On) => {
    const disk = stub(on, world("localok"));
    await push($, "/work/localok");
    await record($, {
      repo: "github.com/them/localok",
      verdict: "forbidden",
      quote: POLICY,
      read: ["/work/localok/AGENTS.md"],
    });
    expect(Object.keys(disk).some((k) => k.endsWith("them_localok.json"))).toBe(
      true,
    );
    const cd = "cd /work/localok &&";
    for (const out of [
      await write($, "/work/localok"),
      await $.tool.call({
        tool: "Edit",
        file_path: "/work/localok/src/a.ts",
        old_string: "a",
        new_string: "b",
      }),
      await bash($, `${cd} git commit -am x`),
      await bash($, `${cd} git fetch && make && echo x > out.txt`),
    ])
      expect(denyOf(out)).toBeUndefined();
  },
);

test(
  "a read of a forbidden repository stays allowed",
  option(),
  async ($: Engine, on: On) => {
    stub(on, world("readonly"));
    await push($, "/work/readonly");
    await record($, {
      repo: "github.com/them/readonly",
      verdict: "forbidden",
      quote: POLICY,
      read: ["/work/readonly/AGENTS.md"],
    });
    const cd = "cd /work/readonly &&";
    for (const command of [
      `${cd} git status`,
      `${cd} git log -3`,
      `${cd} gh pr list`,
      "gh api repos/them/readonly/issues",
    ])
      expect(denyOf(await bash($, command)), command).toBeUndefined();
  },
);

test(
  "a verdict with conditions shows them once in a session",
  option(),
  async ($: Engine, on: On) => {
    stub(
      on,
      world(
        "cond",
        "them",
        "Disclose each use of an AI tool in the pull request.",
      ),
    );
    await push($, "/work/cond");
    const out = await record($, {
      repo: "github.com/them/cond",
      verdict: "conditions",
      quote: "Disclose each use of an AI tool",
      conditions: "Disclose the AI tool in the pull request.",
      read: ["/work/cond/AGENTS.md"],
    });
    expect(String("result" in out ? out.result : "")).toContain(
      "Disclose the AI tool",
    );
    expect(denyOf(await push($, "/work/cond"))).toBeUndefined();
  },
);

test(
  "a write to the verdict store with a file tool is denied",
  option(),
  async ($: Engine, on: On) => {
    stub(on, world("forge"));
    const out = await $.tool.call({
      tool: "Write",
      file_path: "/home/me/.claudetto/policy/github.com_them_forge.json",
      content: "{}",
    });
    expect(denyOf(out)).toContain("mcp__claudetto__ai_policy");
    expect(
      denyOf(await bash($, "echo '{}' > ~/.claudetto/policy/x.json")),
    ).toContain("mcp__claudetto__ai_policy");
  },
);
