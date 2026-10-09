// Lab tests of the `session.start` drift check.
// The stubs answer the reads of the module, and `mock.session` records the note that the check appends.

import { expect, mock, test } from "claude-code/testing";

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
const SECTIONS = [
  { id: "lean_body", text: "body", scope: "shared" },
  { id: "context_management", text: "context", scope: "session" },
];

/** Stubs for a session with no drift. Each option changes one fact. */
function stub(
  on,
  {
    settings = PROFILE,
    policy = {},
    version = "2.1.295",
    skills = [],
    sections = SECTIONS,
    env = {},
    usageFails = false,
    turns = 0,
  } = {},
) {
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("settings.read", (_$, e) => ({
    value: e.source === "policy" ? policy : settings,
  }));
  on("session.version", () => ({ value: { version } }));
  on("session.usage", () => {
    if (usageFails) throw new Error("no usage");
    return {
      value: {
        context: { breakdown: { skills: { skillFrontmatter: skills } } },
      },
    };
  });
  on("session.turns", () => ({ value: turns }));
  on("prompt.compose", () => ({ sections }));
  mock.env(on, env);
  return mock.session(on);
}

const start = ($) =>
  $.session.start({ cwd: "/work/app", surface: null, isInteractive: false });

const noteOf = (session) =>
  session.appended().map((row) => row.message.content[0].text);

test("no drift adds no text", async ($, on) => {
  const session = stub(on);
  await start($);
  expect(session.appended()).toEqual([]);
});

test("a built-in plugin that is on again is named", async ($, on) => {
  const enabledPlugins = { ...PROFILE.enabledPlugins };
  delete enabledPlugins["cc-plugin-tips@builtin"];
  const session = stub(on, { settings: { ...PROFILE, enabledPlugins } });
  await start($);
  const [note] = noteOf(session);
  expect(note).toContain("`cc-plugin-tips@builtin`");
  expect(note).not.toContain("cc-plugin-diff");
});

test("a plugin that the settings set to `true` is on again", async ($, on) => {
  const enabledPlugins = {
    ...PROFILE.enabledPlugins,
    "cc-plugin-diff@builtin": true,
  };
  const session = stub(on, { settings: { ...PROFILE, enabledPlugins } });
  await start($);
  expect(noteOf(session)[0]).toContain("`cc-plugin-diff@builtin`");
});

test("a synced skill in the listing adds a note, and a plugin skill alone adds none", async ($, on) => {
  const plain = stub(on, {
    skills: [{ name: "setup", source: "plugin", tokens: 40 }],
  });
  await start($);
  expect(plain.appended()).toEqual([]);
});

test("a synced skill in the listing adds a note", async ($, on) => {
  const session = stub(on, {
    skills: [
      { name: "setup", source: "plugin", tokens: 40 },
      { name: "anthropic-skills:pdf", source: "syncedSkills", tokens: 60 },
    ],
  });
  await start($);
  expect(session.appended().length).toBe(1);
});

test("a Claude Code version other than `2.1.295` is reported", async ($, on) => {
  const session = stub(on, { version: "2.1.296" });
  await start($);
  const [note] = noteOf(session);
  expect(note).toContain("2.1.296");
});

test("an unknown prompt section id is reported, and a plugin section is not", async ($, on) => {
  const session = stub(on, {
    sections: [
      ...SECTIONS,
      { id: "future_section", text: "new", scope: "session" },
      { id: "acme:policy", text: "plugin", scope: "session" },
    ],
  });
  await start($);
  const [note] = noteOf(session);
  expect(note).toContain("`future_section`");
  expect(note).not.toContain("acme:policy");
  expect(note).not.toContain("lean_body");
});

test("a seated guard names the dotclaude parts that it skips", async ($, on) => {
  const session = stub(on, { policy: { permissions: { deny: [] } } });
  await start($);
  const [note] = noteOf(session);
  expect(note).toContain("`prompt.compose`");
  expect(note).toContain("`prompt.section`");
});

test("a variable that overrides the agent files is reported with its name", async ($, on) => {
  const session = stub(on, { env: { CLAUDE_CODE_EFFORT_LEVEL: "low" } });
  await start($);
  const [note] = noteOf(session);
  expect(note).toContain("`CLAUDE_CODE_EFFORT_LEVEL`");
  expect(note).not.toContain("CLAUDE_CODE_SUBAGENT_MODEL_FORCE");
});

test("one note holds all differences, and a read that fails gives no line", async ($, on) => {
  const session = stub(on, {
    version: "2.1.296",
    policy: { model: "x" },
    usageFails: true,
  });
  await start($);
  expect(session.appended().length).toBe(1);
  const [note] = noteOf(session);
  expect(note).toContain("2.1.296");
  expect(note).toContain("`prompt.compose`");
  expect(note).not.toContain("syncClaudeAiSkills");
});

test("a resumed session, which has user turns in its transcript, gets no second note", async ($, on) => {
  const session = stub(on, { version: "2.1.296", turns: 3 });
  await start($);
  expect(session.appended()).toEqual([]);
});

test("a new session with drift still gets its note", async ($, on) => {
  const session = stub(on, { version: "2.1.296", turns: 0 });
  await start($);
  expect(session.appended().length).toBe(1);
});
