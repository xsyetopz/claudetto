// Tests of the `session.start` drift check: `onSessionStart` of `adapters/mod.ts`.
// The `$` here is a FAKE object that answers the reads of the handler and records `ui.log`.
// A lab test in `lab/` cannot import slice code, because one import path is not right in `src/` and in the copy in `tests/`.

import { expect, test } from "bun:test";
import type { ContextSkill, EngineInterface, SessionUsage } from "claude-code";
import { onSessionStart } from "../../../plugins/claudetto/slices/setup/adapters/mod.ts";
import { planAutoMode } from "../../../plugins/claudetto/slices/setup/domain/automode.ts";
import { snippetFor } from "../../../plugins/claudetto/slices/setup/domain/merge.ts";
import { GAP_KEYS_MAX } from "../../../plugins/claudetto/slices/setup/limits.ts";

const ROOT = "/plugins/claudetto";

/** The snippet of `current` with the `autoMode` lists that setup writes to the user settings. */
const applied = (current: unknown, root: string, mythos = false) => ({
  ...snippetFor(current, root, mythos),
  ...planAutoMode(current, []),
});
const OFF = [
  "cc-plugin-agents-md@builtin",
  "cc-plugin-claude-test@builtin",
  "cc-plugin-diff@builtin",
  "cc-plugin-mermaid@builtin",
  "cc-plugin-mods-guide@builtin",
  "cc-plugin-responsive-mode@builtin",
  "cc-plugin-telemetry@builtin",
  "cc-plugin-tips@builtin",
  "cc-plugin-you-should-know@builtin",
];
const PROFILE = {
  enabledPlugins: Object.fromEntries(OFF.map((id) => [id, false])),
  syncClaudeAiSkills: false,
};

/** A usage report that lists only the given skills. */
const usageOf = (skillFrontmatter: ContextSkill[]): SessionUsage =>
  ({
    context: { breakdown: { skills: { skillFrontmatter } } },
  }) as unknown as SessionUsage;

type Facts = {
  settings?: Record<string, unknown>;
  user?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  skills?: ContextSkill[];
  env?: Record<string, string>;
  usageFails?: boolean;
  turns?: number;
};

/** Run the handler with a fake `$` for a session with no drift. Each option changes one fact. Returns the notices it showed. */
const run = async ({
  settings = applied({}, ROOT),
  user = settings,
  policy = {},
  skills = [],
  env = {},
  usageFails = false,
  turns = 0,
}: Facts = {}): Promise<string[]> => {
  const notes: string[] = [];
  const fake = {
    plugin: { root: ROOT },
    settings: {
      read: async (o?: { source?: string }) => {
        if (o?.source === "policy") return policy;
        return o?.source === "user" ? user : settings;
      },
    },
    session: {
      usage: async () => {
        if (usageFails) throw new Error("no usage");
        return usageOf(skills);
      },
      turns: async () => turns,
    },
    ui: { log: (text: string) => notes.push(text) },
    env: { get: async (name: string) => env[name] },
  } as unknown as EngineInterface;
  const next = async (e: unknown) => e;
  await onSessionStart(fake, { cwd: "/work/app" } as never, next as never);
  return notes;
};

test("no drift adds no text", async () => {
  expect(await run()).toEqual([]);
});

test("the `autoMode` lists of the project settings do not count as the user's", async () => {
  // The merged settings hold the lists, but the user settings do not.
  const [note] = await run({ user: snippetFor({}, ROOT) });
  expect(note).toContain("`autoMode`");
  expect(await run()).toEqual([]);
});

test("a built-in plugin that is on again is named", async () => {
  const enabledPlugins = { ...PROFILE.enabledPlugins };
  delete enabledPlugins["cc-plugin-tips@builtin"];
  const [note] = await run({ settings: { ...PROFILE, enabledPlugins } });
  expect(note).toContain("`cc-plugin-tips@builtin`");
  expect(note).not.toContain("cc-plugin-diff");
});

test("a plugin that the settings set to `true` is on again", async () => {
  const enabledPlugins = {
    ...PROFILE.enabledPlugins,
    "cc-plugin-diff@builtin": true,
  };
  const [note] = await run({ settings: { ...PROFILE, enabledPlugins } });
  expect(note).toContain("`cc-plugin-diff@builtin`");
});

test("a synced skill in the listing adds a note, and a plugin skill alone adds none", async () => {
  expect(
    await run({ skills: [{ name: "setup", source: "plugin", tokens: 40 }] }),
  ).toEqual([]);
  const notes = await run({
    skills: [
      { name: "setup", source: "plugin", tokens: 40 },
      { name: "anthropic-skills:pdf", source: "syncedSkills", tokens: 60 },
    ],
  });
  expect(notes).toHaveLength(1);
  expect(notes[0]).toContain("`syncClaudeAiSkills`");
});

test("a seated guard names the claudetto parts that it skips", async () => {
  const [note] = await run({ policy: { permissions: { deny: [] } } });
  expect(note).toContain("`prompt.compose`");
  expect(note).toContain("`prompt.section`");
});

test("a variable that overrides the agent files is reported with its name", async () => {
  const [note] = await run({ env: { CLAUDE_CODE_EFFORT_LEVEL: "low" } });
  expect(note).toContain("`CLAUDE_CODE_EFFORT_LEVEL`");
  expect(note).not.toContain("CLAUDE_CODE_SUBAGENT_MODEL_FORCE");
});

test("one note holds all differences, and a read that fails gives no line", async () => {
  const notes = await run({
    policy: { model: "x" },
    usageFails: true,
  });
  expect(notes.length).toBe(1);
  expect(notes[0]).toContain("`prompt.compose`");
  expect(notes[0]).not.toContain("syncClaudeAiSkills");
});

test("a resumed session, which has user turns in its transcript, gets no second note", async () => {
  expect(await run({ policy: { model: "x" }, turns: 3 })).toEqual([]);
});

test("a new session with drift still gets its note", async () => {
  expect((await run({ policy: { model: "x" }, turns: 0 })).length).toBe(1);
});

test("a settings file without the snippet names the missing values and the setup skill", async () => {
  const [note] = await run({ settings: PROFILE });
  // The missing keys are the snippet keys that `PROFILE` does not hold with the same value, and the built-in plugins have their own line.
  const want = applied(PROFILE, ROOT);
  const have: Record<string, unknown> = PROFILE;
  const missing = Object.keys(want).filter(
    (k) =>
      k !== "enabledPlugins" &&
      JSON.stringify(have[k]) !== JSON.stringify(want[k]),
  );
  const named = missing.slice(0, GAP_KEYS_MAX).map((k) => `\`${k}\``);
  expect(note).toContain(`: ${named.join(", ")}`);
  expect(note).not.toContain(`\`${missing[GAP_KEYS_MAX]}\``);
  expect(note).toContain("`/claudetto:setup`");
});

test("a status line of another plugin version folder is reported as stale", async () => {
  const [note] = await run({
    settings: applied({}, "/cache/claudetto/claudetto/0.27.0"),
  });
  expect(note).toContain("`statusLine.command`");
  expect(note).toContain("`subagentStatusLine.command`");
});

test("a settings file with Mythos in place of Fable has no drift", async () => {
  expect(await run({ settings: applied({}, ROOT, true) })).toEqual([]);
});
