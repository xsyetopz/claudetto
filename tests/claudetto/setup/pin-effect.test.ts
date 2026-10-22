// Each name that the settings snippet writes has a pin of its effect (spec `settings-levers`, "Pinned Effect").
// A pin runs the installed `claude` against a stub of the Messages API, once with no settings and once with only the lever.
// The effect must show with the lever and not without it, so a later Claude Code that ignores the lever fails the pin.
// A lever whose effect no stub run can show is in `UNREACHED` with the reason, and its pin is that the bundle still reads the name.
// The runs skip when `claude` is not on `PATH`, as in `just docker check`, and cost $0, because no request leaves the host.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PLAN_CAPS } from "../../../plugins/claudetto/slices/setup/limits.ts";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import {
  BUNDLE_SCAN_TIMEOUT_MS,
  PIN_RUNS_TIMEOUT_MS,
  STUB_RUNS_AT_ONCE,
} from "../../../tools/limits.ts";
import { installedBundle } from "../../../tools/schema/adapters/cli.ts";
import { PLUGINS } from "../../support/repo.ts";
import { type Settings, snippetLevers } from "../../support/settings-pin.ts";
import {
  type Capture,
  plain,
  type Run,
  stubCapture,
  TITLE,
} from "../../support/stub-api.ts";

type Pin = {
  run?: Run;
  /** The settings of the lever run, when they are not the snippet value alone. */
  settings?: Settings;
  /** True when the capture shows the effect of the lever. */
  effect: (c: Capture) => boolean;
};

// Setup adds the cap of the plan of the login (design D3), so the pin uses the smallest cap of `PLAN_CAPS`.
const LEVERS = snippetLevers({
  ...SNIPPET,
  env: {
    ...SNIPPET.env,
    CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: String(
      Math.min(...Object.values(PLAN_CAPS)),
    ),
  },
});
const text = (value: unknown): string => JSON.stringify(value) ?? "";
const init = (c: Capture): Record<string, unknown> => c.events[0] ?? {};
const lists = (c: Capture, field: string, name: string): boolean =>
  ((init(c)[field] as unknown[] | undefined) ?? []).includes(name);
/** A token count as `/context` writes it, such as `144.4k`. */
const kilo = (n: number): string => `${Number((n / 1000).toFixed(1))}k`;
const result = (c: Capture): string =>
  String(c.events.find((e) => e["type"] === "result")?.["result"] ?? "");

const PLAN: Run = { args: ["--permission-mode", "plan"] };
const ANSWERED = /⏺\s*done/;
const FEEDBACK: Run = {
  prompt: "/feedback",
  until: /Esc to close|Submit feedback|disabled via/,
};
const agent = (n: number) => ({
  name: "Agent",
  input: {
    description: `t${n}`,
    prompt: `say ${n}`,
    subagent_type: "general-purpose",
  },
});
const git = (cwd: string, ...args: string[]) =>
  Bun.spawnSync(["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args], {
    cwd,
  });

/** The denied names with no pattern, such as `ScheduleWakeup`, which leave the tool list. */
const deniedTools = SNIPPET.permissions.deny.filter((rule) =>
  /^\w+$/.test(rule),
);
const offPlugins = Object.entries(SNIPPET.enabledPlugins)
  .filter(([, on]) => !on)
  .map(([source]) => source);
const [haiku, haikuSettings] = Object.entries(SNIPPET.modelSettings)[0] as [
  string,
  { autoCompactWindow: number },
];
const PINS: Record<string, Pin> = {
  CLAUDE_CODE_DISABLE_FAST_MODE: {
    effect: (c) => init(c)["fast_mode_disabled_reason"] === "disabled_by_env",
  },
  CLAUDE_CODE_PROMPT_CACHE_TTL: {
    effect: (c) => text(c.requests[0]).includes('"ttl":"1h"'),
  },
  CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: {
    // 850,000 tokens are under the default threshold of a window of 980,000 and over 80.3571 % of it.
    run: {
      calls: [{ name: "Bash", input: { command: "echo hi" } }],
      tokens: 850_000,
    },
    effect: (c) => c.debug.includes("level=compact"),
  },
  CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: {
    effect: (c) => !text(c.requests[0]).includes("gitStatus"),
  },
  CLAUDE_CODE_DISABLE_ADVISOR_TOOL: {
    effect: (c) => !lists(c, "slash_commands", "advisor"),
  },
  CLAUDE_CODE_DISABLE_TERMINAL_TITLE: {
    run: { until: ANSWERED },
    effect: (c) => c.screen !== "" && !c.screen.includes(TITLE),
  },
  CLAUDE_CODE_DISABLE_CRON: { effect: (c) => !lists(c, "tools", "CronCreate") },
  CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: {
    effect: (c) =>
      !lists(c, "agents", "Explore") && !lists(c, "agents", "Plan"),
  },
  CLAUDE_CODE_FORK_SUBAGENT: {
    effect: (c) => !text(c.requests[0]).includes("If you are the fork"),
  },
  CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: {
    run: { calls: [agent(1), agent(2), agent(3)] },
    effect: (c) =>
      text(c.requests).includes(
        `You can run ${LEVERS["CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS"]?.env?.["CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS"]} subagents at once`,
      ),
  },
  // The snippet value 1 is the default of an account with no Max plan, so the pin sets 2 to show that the var works.
  CLAUDE_CODE_PLAN_V2_AGENT_COUNT: {
    run: PLAN,
    settings: { env: { CLAUDE_CODE_PLAN_V2_AGENT_COUNT: "2" } },
    effect: (c) => text(c.requests[0]).includes("up to 2 agent(s)"),
  },
  CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT: {
    run: PLAN,
    effect: (c) =>
      text(c.requests[0]).includes(
        `Launch up to ${SNIPPET.env.CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT} Explore agents`,
      ),
  },
  DISABLE_FEEDBACK_COMMAND: {
    run: FEEDBACK,
    effect: (c) =>
      plain(c.screen).includes("disabled via the DISABLE_FEEDBACK_COMMAND"),
  },
  "permissions.deny": {
    effect: (c) =>
      lists(c, "tools", "Read") &&
      deniedTools.every((tool) => !lists(c, "tools", tool)),
  },
  "permissions.defaultMode": {
    run: { until: /mode on/ },
    effect: (c) => plain(c.screen).includes("manual mode on"),
  },
  "permissions.disableAutoMode": {
    run: { until: /mode on/ },
    effect: (c) => plain(c.screen).includes("manual mode on"),
  },
  skillOverrides: {
    effect: (c) =>
      text(c.requests[0]).includes("- plugin-authoring") &&
      !text(c.requests[0]).includes("- plugin-authoring:"),
  },
  disableBundledSkills: { effect: (c) => !lists(c, "skills", "debug") },
  worktree: {
    run: {
      args: ["--worktree", "pin"],
      calls: [{ name: "Bash", input: { command: "git log --format=%s" } }],
      // `origin/main` has commit `A`, and `HEAD` has `B` on top of it.
      prepare: ({ project }) => {
        const origin = path.join(project, "..", "origin.git");
        git(project, "commit", "-q", "--allow-empty", "-m", "A");
        git(project, "init", "-q", "--bare", origin);
        git(project, "remote", "add", "origin", origin);
        git(project, "push", "-q", "origin", "HEAD:main");
        git(project, "fetch", "-q", "origin");
        git(project, "remote", "set-head", "origin", "main");
        git(project, "checkout", "-q", "-b", "feature");
        git(project, "commit", "-q", "--allow-empty", "-m", "B");
      },
    },
    effect: (c) => text(c.requests[1]).includes("B\\nA"),
  },
  enableWorkflows: { effect: (c) => !lists(c, "tools", "Workflow") },
  statusLine: {
    // The command picks the newest folder of the plugin in the plugin cache of the config folder.
    run: {
      until: ANSWERED,
      prepare: ({ config }) => {
        const cache = path.join(config, "plugins/cache/claudetto/claudetto");
        fs.mkdirSync(cache, { recursive: true });
        fs.symlinkSync(path.join(PLUGINS, "claudetto"), `${cache}/0.3.0`);
      },
    },
    settings: { statusLine: SNIPPET.statusLine },
    effect: (c) => plain(c.screen).includes("◈"),
  },
  enabledPlugins: {
    effect: (c) =>
      init(c)["plugins"] !== undefined &&
      offPlugins.every((source) => !text(init(c)["plugins"]).includes(source)),
  },
  outputStyle: {
    effect: (c) => init(c)["output_style"] === SNIPPET.outputStyle,
  },
  feedbackDrafts: {
    run: FEEDBACK,
    effect: (c) => plain(c.screen).includes("Submit feedback"),
  },
  modelSettings: {
    run: { prompt: "/context", args: ["--model", haiku] },
    effect: (c) =>
      result(c).includes(`/ ${kilo(haikuSettings.autoCompactWindow)}`),
  },
  autoCompactWindow: {
    run: { prompt: "/context" },
    effect: (c) => result(c).includes(`/ ${kilo(SNIPPET.autoCompactWindow)}`),
  },
  autoMemoryEnabled: {
    effect: (c) => "tools" in init(c) && !("memory_paths" in init(c)),
  },
  useAutoModeDuringPlan: {
    run: PLAN,
    effect: (c) =>
      c.requests[0] !== undefined && !("safeguards" in c.requests[0]),
  },
};

const LOGIN =
  "It acts only with a claude.ai login, and a stub run has an API key only.";
const NO_CHANGE =
  "A stub run, headless and in a terminal, shows no change with it.";

/** The levers whose effect no stub run shows, with the reason. */
const UNREACHED: Record<string, string> = {
  CLAUDE_CODE_TOTAL_TOKENS_REMINDER: `${NO_CHANGE} The reminder is not in a stub capture without it either.`,
  CLAUDE_CODE_BASH_OUTPUT_AUDIENCE_NOTE: `${NO_CHANGE} The note is not in a \`Bash\` result of a stub run without it either.`,
  CLAUDE_CODE_SILENT_TURN_REMINDER: `${NO_CHANGE} The reminder is not in a stub capture without it either.`,
  CLAUDE_CODE_TODO_REMINDER_MODE: `${NO_CHANGE} The reminder is not in a stub capture without it either.`,
  CLAUDE_CODE_MEMORY_SUBAGENT_APPEND: `${NO_CHANGE} The subagent request is the same, also with a seeded memory.`,
  CLAUDE_CODE_AUTO_CONNECT_IDE: "It acts only when an IDE runs.",
  CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL: "It acts only when an IDE runs.",
  CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY:
    "The survey shows only after some turns, at random.",
  DISABLE_ERROR_REPORTING:
    "The reports go to an error service, and not to the Messages API.",
  CLAUDE_CODE_DISABLE_CFC_PROMPT: "The Chrome prompt is behind a server flag.",
  DISABLE_EXTRA_USAGE_COMMAND: `${LOGIN} Without a login, \`/extra-usage\` is an unknown command.`,
  DISABLE_INSTALL_GITHUB_APP_COMMAND: `${LOGIN} Without a login, \`/install-github-app\` is an unknown command.`,
  disableRemoteControl: `${LOGIN} Without a login, \`/remote-control\` is an unknown command.`,
  disableClaudeAiConnectors: LOGIN,
  enableArtifact: `${LOGIN} ${NO_CHANGE}`,
  subagentStatusLine:
    "It shows only while a subagent runs in a terminal, and a stub subagent ends at once.",
  spinnerTipsEnabled: `${NO_CHANGE} A tip shows only in a long turn.`,
  promptSuggestionEnabled: `${NO_CHANGE} A stub run sends no suggestion request without it either.`,
  awaySummaryEnabled: "The summary needs a terminal that loses focus.",
  modelProposedGoals: NO_CHANGE,
  autoDreamEnabled: "Auto dream starts only after many sessions.",
};

test("each name of the snippet has a pin or a reason in `UNREACHED`, and no other name", () => {
  expect(
    [...Object.keys(PINS), ...Object.keys(UNREACHED)].sort(),
  ).toStrictEqual(Object.keys(LEVERS).sort());
});

const installed = Bun.which("claude") !== null;

let free = STUB_RUNS_AT_ONCE;
const waiting: (() => void)[] = [];
/** Runs `f` when fewer than `STUB_RUNS_AT_ONCE` runs are active. */
const limited = async <T>(f: () => Promise<T>): Promise<T> => {
  while (free === 0) await new Promise<void>((go) => waiting.push(go));
  free--;
  try {
    return await f();
  } finally {
    free++;
    waiting.shift()?.();
  }
};

// The runs start at once, so that they overlap, and each test waits for its own pair.
const pairs = new Map(
  installed
    ? Object.entries(PINS).map(([name, pin]) => [
        name,
        Promise.all([
          limited(() => stubCapture({}, pin.run)),
          limited(() =>
            stubCapture(pin.settings ?? (LEVERS[name] as Settings), pin.run),
          ),
        ]),
      ])
    : [],
);

for (const [name, pin] of Object.entries(PINS))
  test.skipIf(!installed)(
    `\`${name}\` changes the stub run, and the run without it has no such change`,
    async () => {
      const [without, withLever] = (await pairs.get(name)) as [
        Capture,
        Capture,
      ];
      expect(pin.effect(without)).toBe(false);
      expect(pin.effect(withLever)).toBe(true);
    },
    PIN_RUNS_TIMEOUT_MS,
  );

test.skipIf(!installed)(
  "the bundle of the installed `claude` reads each name of `UNREACHED`",
  async () => {
    const bundle = Buffer.from(
      await Bun.file(installedBundle()).arrayBuffer(),
    ).toString("latin1");
    expect(
      Object.keys(UNREACHED).filter((name) => !bundle.includes(name)),
    ).toStrictEqual([]);
  },
  BUNDLE_SCAN_TIMEOUT_MS,
);
