// The changes of the YOLO setup to a `settings.json` of Claude Code: auto mode with no opt-in dialog,
// and one `PreToolUse` hook that asks Jev about each `AskUserQuestion` call.
// Each other key of the settings stays as it is.

/** The end of the command of the Jev hook, which marks the hook as ours on a second run. */
export const HOOK_MARK = "tools/yolo/hook.ts";

/** The time limit of the Jev hook in seconds, more than the 12 s of one Jev call. */
export const HOOK_TIMEOUT_S = 30;

type Json = Record<string, unknown>;
interface HookEntry {
  readonly matcher?: string;
  readonly hooks?: readonly { readonly command?: string }[];
}

const isObject = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const objectAt = (s: Json, key: string): Json => {
  const v = s[key];
  if (isObject(v)) return v;
  const fresh: Json = {};
  s[key] = fresh;
  return fresh;
};

const isOurs = (entry: HookEntry): boolean =>
  (entry.hooks ?? []).some((h) => h.command?.includes(HOOK_MARK) ?? false);

/** Changes `settings` in place for the YOLO setup, and gives a line for each change. */
export const applyYolo = (settings: Json, command: string): string[] => {
  const changes: string[] = [];
  const permissions = objectAt(settings, "permissions");
  if (permissions["defaultMode"] !== "auto") {
    permissions["defaultMode"] = "auto";
    changes.push("permissions.defaultMode = auto");
  }
  if ("disableAutoMode" in permissions) {
    delete permissions["disableAutoMode"];
    changes.push("permissions.disableAutoMode removed");
  }
  if (settings["skipAutoPermissionPrompt"] !== true) {
    settings["skipAutoPermissionPrompt"] = true;
    changes.push("skipAutoPermissionPrompt = true");
  }
  const hooks = objectAt(settings, "hooks");
  const before = Array.isArray(hooks["PreToolUse"])
    ? (hooks["PreToolUse"] as HookEntry[])
    : [];
  const after = [
    ...before.filter((e) => !isOurs(e)),
    {
      matcher: "AskUserQuestion",
      hooks: [{ type: "command", command, timeout: HOOK_TIMEOUT_S }],
    },
  ];
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    hooks["PreToolUse"] = after;
    changes.push("hooks.PreToolUse: Jev hook on AskUserQuestion");
  }
  return changes;
};
