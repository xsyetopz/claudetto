// The rules of the managed setup help of the `handoff` slice (spec `handoff`, "Managed setup help").
// The help adds `claudetto` to `appendPlugins` and `enabledPlugins` in the managed settings file of the OS,
// with one `! sudo` command, because the `Bash` tool cannot answer a password prompt.
// The command writes the merged file in one step: the help reads the file, and the new text keeps each of its keys.
// When an organization is in control, the help gives no command and tells the user to ask the admin.
// An organization is in control when the plan is Team or Enterprise, an MDM profile exists,
// or the managed settings have a key that the file does not have, which comes from the server, MDM, or a drop-in file.
// The functions are pure, and the adapter reads the facts.

import {
  ADMIN_HELP,
  ALREADY_LISTED,
  NEW_FILE_WARNING,
  OTHERS_LOST,
  SETUP_ADMIN_SHELL,
  SETUP_CREATE,
  SETUP_RUN_COMMAND,
  SETUP_UPDATE,
} from "../prompts.ts";
import { isAppended, pluginId } from "./managed.ts";

/** The folder of the managed settings file for each OS, as Claude Code reads it (`handoff-managed-300.md`). */
export const MANAGED_DIRS = {
  darwin: "/Library/Application Support/ClaudeCode",
  linux: "/etc/claude-code",
  win32: "C:\\Program Files\\ClaudeCode",
} as const;

/** The OS of the machine, as a key of `MANAGED_DIRS`. */
export type Os = keyof typeof MANAGED_DIRS;

/** The name of the managed settings file in its folder. */
export const MANAGED_FILE = "managed-settings.json";

/** The path of the managed settings file on `os`, with the separator of that OS. */
export const managedPath = (os: Os): string =>
  `${MANAGED_DIRS[os]}${os === "win32" ? "\\" : "/"}${MANAGED_FILE}`;

/** The MDM profiles of Claude Code on macOS for the user `user`: the profile of the user and the profile of the device. */
export const mdmProfiles = (user: string | undefined): string[] => [
  ...(user
    ? [`/Library/Managed Preferences/${user}/com.anthropic.claudecode.plist`]
    : []),
  "/Library/Managed Preferences/com.anthropic.claudecode.plist",
];

/** A plan of the organization that has server-managed settings, such as `claude_team` or `claude_enterprise`. */
const ORGANIZATION_PLAN = /(^|_)(team|enterprise)$/;

/** A JSON object. */
type Settings = Readonly<Record<string, unknown>>;

/** The facts of the machine that decide the help. */
export type Machine = {
  readonly os: Os;
  /** The managed settings, as `$.settings.read({ source: "policy" })` gives them. */
  readonly policy: Settings | undefined;
  /** The managed settings file, or `undefined` when it does not exist. */
  readonly file: Settings | undefined;
  readonly plan: string | undefined;
  readonly hasMdm: boolean;
  /** The plugins outside the `append` tier that hook `session.compact`. */
  readonly others: readonly string[];
};

/** True when an organization manages Claude Code on the machine. */
export const isOrganizationManaged = (m: Machine): boolean =>
  (m.plan !== undefined && ORGANIZATION_PLAN.test(m.plan)) ||
  m.hasMdm ||
  Object.keys(m.policy ?? {}).some((key) => !(key in (m.file ?? {})));

/** `file` with the plugin `id` in `appendPlugins` and in `enabledPlugins`, and each other key kept. */
export const mergedSettings = (file: Settings | undefined, id: string) => {
  const appended = Array.isArray(file?.["appendPlugins"])
    ? file["appendPlugins"]
    : [];
  const enabled = file?.["enabledPlugins"];
  return {
    ...file,
    appendPlugins: appended.includes(id) ? appended : [...appended, id],
    enabledPlugins: {
      ...(typeof enabled === "object" && enabled !== null ? enabled : {}),
      [id]: true,
    },
  };
};

/** `text` in single quotes for a POSIX shell. */
const quoted = (text: string) => `'${text.replaceAll("'", "'\\''")}'`;

/** The one `! sudo` command that writes `json` to the managed settings file in `dir`, and creates `dir` when it is missing. */
export const sudoCommand = (dir: string, json: string): string =>
  // biome-ignore lint/plugin: a shell command, not a message
  `! sudo sh -c 'mkdir -p "$1" && printf "%s\\n" "$2" > "$1/${MANAGED_FILE}"' sh ${quoted(dir)} ${quoted(json)}`;

/** The help when an organization is in control: no command, and the entries to ask the admin for. */
export const adminHelp = (id: string): string => ADMIN_HELP({ id });

/** The warning before a new managed settings file: the guard turns on, and each plugin in `others` loses `session.compact`. */
export const newFileWarning = (others: readonly string[]): string =>
  others.length === 0
    ? NEW_FILE_WARNING
    : [
        NEW_FILE_WARNING,
        OTHERS_LOST({ names: others.map((name) => `\`${name}\``).join(", ") }),
      ].join(" ");

/** The help of the managed setup for the plugin `name` on `m`, as the text of the command. */
export const setupHelp = (m: Machine, name: string): string => {
  const id = pluginId(name);
  if (isAppended(m.policy, name)) return ALREADY_LISTED({ name });
  if (isOrganizationManaged(m)) return adminHelp(id);
  const dir = MANAGED_DIRS[m.os];
  const path = managedPath(m.os);
  const merged = mergedSettings(m.file, id);
  const lines = [
    m.file === undefined ? SETUP_CREATE({ path }) : SETUP_UPDATE({ path }),
    "",
    JSON.stringify(merged, null, 2),
    "",
  ];
  if (m.file === undefined) lines.push(newFileWarning(m.others), "");
  lines.push(
    m.os === "win32"
      ? SETUP_ADMIN_SHELL
      : SETUP_RUN_COMMAND({
          command: sudoCommand(dir, JSON.stringify(merged)),
        }),
  );
  return lines.join("\n");
};
