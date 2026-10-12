// Review payloads for the ask on a changed settings file or hooks file (package P36).
// A call gets no ask only when it adds a hook, adds a `deny` or `ask` rule, or removes an `allow` rule.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { editAsks } from "../calls.ts";

/** `[title, file, text, old, new]` for an `Edit` that must get an ask. */
type Case = [string, string, string, string, string];

const S = "/w/.claude/settings.json";
const HOOK = (extra = "") =>
  `{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"guard.sh"${extra}}]}]}}`;

const ASKS: Case[] = [
  [
    "settings deny rm",
    "/w/.claude/settings.json",
    `{"permissions":{"deny":["Bash(rm:*)","Read(.env)"]}}`,
    '"Bash(rm:*)",',
    "",
  ],
  [
    "settings allow",
    "/w/.claude/settings.json",
    `{"permissions":{"allow":[]}}`,
    '"allow":[]',
    '"allow":["Bash(*)"]',
  ],
  [
    "settings allow Bash",
    "/w/.claude/settings.json",
    `{"permissions":{"allow":[]}}`,
    '"allow":[]',
    '"allow":["Bash"]',
  ],
  [
    "settings allow *",
    "/w/.claude/settings.json",
    `{"permissions":{"allow":[]}}`,
    '"allow":[]',
    '"allow":["*"]',
  ],
  [
    "settings bypass",
    "/w/.claude/settings.json",
    `{"permissions":{}}`,
    "{}",
    '{"defaultMode":"bypassPermissions"}',
  ],
  [
    "settings disableAll",
    "/w/.claude/settings.json",
    `{"a":1}`,
    '"a":1',
    '"a":1,"disableAllHooks":true',
  ],
  [
    "settings hooks cmd",
    "/w/.claude/settings.json",
    `{"hooks":{"PreToolUse":[{"hooks":[{"type":"command","command":"guard.sh"}]}]}}`,
    "guard.sh",
    "true",
  ],
  [
    "settings hooks rm",
    "/w/.claude/settings.json",
    `{"hooks":{"PreToolUse":[{"hooks":[{"type":"command","command":"guard.sh"}]}]}}`,
    '"PreToolUse":[{"hooks":[{"type":"command","command":"guard.sh"}]}]',
    "",
  ],
  [
    "settings skipDangerous",
    "/w/.claude/settings.json",
    `{"a":1}`,
    '"a":1',
    '"a":1,"skipDangerousModePermissionPrompt":true',
  ],
  [
    "settings sandbox off",
    "/w/.claude/settings.json",
    `{"sandbox":{"enabled":true}}`,
    "true",
    "false",
  ],
  [
    "settings ask->allow",
    "/w/.claude/settings.json",
    `{"permissions":{"ask":["Bash(git push:*)"],"allow":[]}}`,
    '"ask":["Bash(git push:*)"],"allow":[]',
    '"ask":[],"allow":["Bash(git push:*)"]',
  ],
  [
    "settings deny->allow same",
    "/w/.claude/settings.json",
    `{"permissions":{"deny":["Bash(rm:*)"]}}`,
    '"deny"',
    '"allow"',
  ],
  [
    "settings local",
    "/w/.claude/settings.local.json",
    `{"permissions":{"deny":["Bash(rm:*)"]}}`,
    '"Bash(rm:*)"',
    "",
  ],
  [
    "hooks.json cmd",
    "/w/hooks/hooks.json",
    `{"hooks":{"PreToolUse":[{"hooks":[{"type":"command","command":"guard.sh"}]}]}}`,
    "guard.sh",
    "true",
  ],
  [
    "hook timeout",
    "/w/.claude/settings.json",
    `{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"guard.sh","timeout":10}]}]}}`,
    '"Bash"',
    '"NoSuchTool"',
  ],
  [
    "hook matcher",
    "/w/.claude/settings.json",
    `{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"guard.sh"}]}]}}`,
    '"Bash"',
    '"NoSuchTool"',
  ],
  ["settings model changed", S, '{"model":"opus"}', "opus", "haiku"],
  [
    "settings env added",
    S,
    '{"model":"opus"}',
    '"model":"opus"',
    '"model":"opus","env":{"A":"1"}',
  ],
  [
    "settings mode changed",
    S,
    '{"permissions":{"defaultMode":"default"}}',
    '"default"',
    '"plan"',
  ],
  [
    "settings additionalDirectories",
    S,
    '{"permissions":{}}',
    "{}",
    '{"additionalDirectories":["/"]}',
  ],
  ["settings hook timeout", S, HOOK(), '"guard.sh"', '"guard.sh","timeout":1'],
  ["settings hook changed", S, HOOK(), "guard.sh", "guard2.sh"],
  ["settings hook event renamed", S, HOOK(), "PreToolUse", "PostToolUse"],
  [
    "settings deny moved to ask",
    S,
    '{"permissions":{"deny":["Bash(rm:*)"],"ask":[]}}',
    '"deny":["Bash(rm:*)"],"ask":[]',
    '"deny":[],"ask":["Bash(rm:*)"]',
  ],
  [
    "settings plugin off",
    S,
    '{"enabledPlugins":{"a@b":true}}',
    "true",
    "false",
  ],
  [
    "hooks.json hook changed",
    "/w/hooks/hooks.json",
    HOOK(),
    "guard.sh",
    "guard2.sh",
  ],
  [
    "hooks.json hook removed",
    "/w/hooks/hooks.json",
    HOOK(),
    '"hooks":[{"type":"command","command":"guard.sh"}]',
    '"hooks":[]',
  ],
  [
    "hook script line changed",
    "/w/.husky/pre-commit",
    "just check\n",
    "just check",
    "just lint",
  ],
  [
    "hook script line added",
    "/w/.husky/pre-commit",
    "just check\n",
    "just check\n",
    "just check\necho done\n",
  ],
  [
    "hook script exit 0",
    "/w/.husky/pre-commit",
    "just check\n",
    "just check\n",
    "just check\nexit 0\n",
  ],
];

for (const [title, file, text, old, now] of ASKS)
  test(`the review payload \`${title}\` gets an ask`, async () => {
    expect(await editAsks(file, text, old, now)).toBe(true);
  });

const SAFE: Case[] = [
  [
    "added hook",
    S,
    HOOK(),
    "}]}]}}",
    '}]},{"matcher":"Write","hooks":[{"type":"command","command":"b.sh"}]}]}}',
  ],
  [
    "added hook event",
    S,
    HOOK(),
    "}]}]}}",
    '}]}],"PostToolUse":[{"hooks":[{"type":"command","command":"b.sh"}]}]}}',
  ],
  [
    "added deny rule",
    S,
    '{"permissions":{"deny":["Bash(rm:*)"]}}',
    '"Bash(rm:*)"',
    '"Bash(rm:*)","Read(.env)"',
  ],
  [
    "added ask rule",
    S,
    '{"permissions":{"ask":[]}}',
    '"ask":[]',
    '"ask":["Bash(git push:*)"]',
  ],
  [
    "removed allow rule",
    S,
    '{"permissions":{"allow":["Bash(ls:*)","Bash(cat:*)"]}}',
    '"Bash(ls:*)",',
    "",
  ],
  ["format change", S, HOOK(), '"PreToolUse":[', '"PreToolUse": [\n'],
  [
    "reordered deny rules",
    S,
    '{"permissions":{"deny":["a","b"]}}',
    '"a","b"',
    '"b","a"',
  ],
  [
    "added hook to hooks.json",
    "/w/hooks/hooks.json",
    HOOK(),
    "}]}]}}",
    '}]},{"matcher":"Write","hooks":[{"type":"command","command":"b.sh"}]}]}}',
  ],
  [
    "comment in a hook script",
    "/w/.husky/pre-commit",
    "just check\n",
    "just check",
    "# c\njust check",
  ],
];

for (const [title, file, text, old, now] of SAFE)
  test(`the safe change \`${title}\` gets no ask`, async () => {
    expect(await editAsks(file, text, old, now)).toBe(false);
  });
