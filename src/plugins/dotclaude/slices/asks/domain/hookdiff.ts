// The check on a weaker hook file or settings file (package P36), as pure functions.
// A hook file gets weaker when a hook or a matcher is removed, or when a hook command changes to one that cannot fail.
// A settings file gets weaker when a deny or ask rule is removed, an allow rule is added, or a hook is removed or turned off.
// A hook script that is not a `hooks.json` gets weaker when it loses a line that makes a hook check, or gains a command that cannot fail.

import {
  CANNOT_FAIL,
  HASH_COMMENT_FILE,
  HOOK_CHECK_LINE,
  PERMISSION_ALLOW_KEYS,
  PERMISSION_DENY_KEYS,
  STRICT_MODES,
  WEAKENING_LINE,
} from "../limits.ts";
import {
  isObj,
  jsonWeaker,
  type Obj,
  readJson,
  UNREADABLE,
} from "./jsondiff.ts";
import { missing, uncommented } from "./scan.ts";
import { shown } from "./shown.ts";
import { textWeaker } from "./textdiff.ts";

/** One hook of a hooks value: the event, the matcher, and the command (or the JSON text of a hook with no command). */
type Hook = { event: string; matcher: string; command: string };

/** The hooks of a `hooks` value, or undefined when the value has a shape that the check cannot read. */
const hooksOf = (value: unknown): Hook[] | undefined => {
  if (value === undefined) return [];
  if (!isObj(value)) return undefined;
  const out: Hook[] = [];
  for (const [event, groups] of Object.entries(value)) {
    if (!Array.isArray(groups)) return undefined;
    for (const group of groups) {
      if (!isObj(group) || !Array.isArray(group["hooks"] ?? []))
        return undefined;
      const matcher = String(group["matcher"] ?? "");
      for (const hook of (group["hooks"] ?? []) as unknown[]) {
        const command =
          isObj(hook) && typeof hook["command"] === "string"
            ? hook["command"]
            : JSON.stringify(hook);
        out.push({ event, matcher, command });
      }
    }
  }
  return out;
};

/** What the change of a hooks value takes from the hooks, or undefined. */
const hooksWeaker = (was: unknown, now: unknown): string | undefined => {
  const [a, b] = [hooksOf(was), hooksOf(now)];
  if (a === undefined || b === undefined) return UNREADABLE;
  const kept = [...b];
  const lost = a.filter((h) => {
    const i = kept.findIndex(
      (k) =>
        k.event === h.event &&
        k.matcher === h.matcher &&
        k.command === h.command,
    );
    if (i >= 0) kept.splice(i, 1);
    return i < 0;
  });
  for (const h of lost) {
    const i = kept.findIndex(
      (k) => k.event === h.event && k.matcher === h.matcher,
    );
    if (i < 0)
      return `It removes the hook \`${shown(h.command)}\` of the event \`${h.event}\`.`;
    const next = (kept.splice(i, 1)[0] as Hook).command;
    if (CANNOT_FAIL.test(next))
      return `It changes the hook \`${shown(h.command)}\` to \`${shown(next)}\`, which cannot fail.`;
  }
  return undefined;
};

/** The JSON object of `text` and its `hooks` value, or undefined when the text is not a JSON object. */
const objectOf = (text: string): Obj | undefined => {
  const v = text.trim() === "" ? {} : readJson(text);
  return isObj(v) ? v : undefined;
};

/** What a call takes from a hooks config such as `hooks.json`, or from a hook script, or undefined. */
export const hookFileWeaker = (
  rel: string,
  before: string,
  after: string,
): string | undefined => {
  const [was, now] = [objectOf(before), objectOf(after)];
  if (was && now) return hooksWeaker(was["hooks"], now["hooks"]);
  const hash = HASH_COMMENT_FILE.test(rel) || /(?:^|\/)\.husky\//.test(rel);
  if (/\.ya?ml$/.test(rel) || /(?:^|\/)\.husky\//.test(rel))
    return textWeaker(before, after, hash);
  const [a, b] = [uncommented(before, hash), uncommented(after, hash)];
  const [lines, next] = [a.split("\n"), b.split("\n")];
  const lost = missing(lines, next).find((l) => HOOK_CHECK_LINE.test(l));
  if (lost !== undefined)
    return `It removes or changes the line \`${shown(lost)}\`, which makes a hook check.`;
  const gained = missing(next, lines).find(
    (l) =>
      WEAKENING_LINE.some((re) => re.test(l)) || /^\s*exit\s+0\s*$/.test(l),
  );
  return gained === undefined
    ? undefined
    : `It adds the line \`${shown(gained)}\`, which lets a hook pass.`;
};

/** The entries of the list at `key` of `obj`, as JSON texts. */
const entries = (obj: unknown, key: string): string[] =>
  isObj(obj) && Array.isArray(obj[key])
    ? obj[key].map((v) => JSON.stringify(v))
    : [];

/** What the change of the `permissions` value does to the asks, or undefined. */
const permissionsWeaker = (was: unknown, now: unknown): string | undefined => {
  for (const key of PERMISSION_DENY_KEYS) {
    const gone = missing(entries(was, key), entries(now, key))[0];
    if (gone !== undefined)
      return `It removes the \`${key}\` rule ${shown(gone)}.`;
  }
  for (const key of PERMISSION_ALLOW_KEYS) {
    const gained = missing(entries(now, key), entries(was, key))[0];
    if (gained !== undefined)
      return `It adds the \`${key}\` entry ${shown(gained)}.`;
  }
  const mode = isObj(now) ? now["defaultMode"] : undefined;
  const old = isObj(was) ? was["defaultMode"] : undefined;
  if (mode !== old && typeof mode === "string" && !STRICT_MODES.includes(mode))
    return `It sets the permission mode to \`${mode}\`.`;
  return undefined;
};

/** What the change of the `enabledPlugins` value does, or undefined. A plugin that is off or gone adds no check. */
const pluginsWeaker = (was: unknown, now: unknown): string | undefined => {
  if (!isObj(was)) return undefined;
  const off = Object.keys(was).find(
    (k) => was[k] === true && (!isObj(now) || now[k] !== true),
  );
  return off === undefined ? undefined : `It turns off the plugin \`${off}\`.`;
};

/** What a call takes from a `.claude/settings*.json` file, or undefined. A text that is not a JSON object asks. */
export const settingsWeaker = (
  before: string,
  after: string,
): string | undefined => {
  const [was, now] = [objectOf(before), objectOf(after)];
  if (!was || !now) return UNREADABLE;
  if (now["disableAllHooks"] === true && was["disableAllHooks"] !== true)
    return "It sets `disableAllHooks` to `true`.";
  return (
    hooksWeaker(was["hooks"], now["hooks"]) ??
    permissionsWeaker(was["permissions"], now["permissions"]) ??
    pluginsWeaker(was["enabledPlugins"], now["enabledPlugins"]) ??
    jsonWeaker(was["sandbox"], now["sandbox"], ["sandbox"])
  );
};
