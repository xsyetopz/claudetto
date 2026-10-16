// The sandbox part of the settings that depends on the user: the SSH signing key of the git config.
// The profile denies `Read(~/.ssh/**)`, and Claude Code turns that rule into a sandbox `denyRead`.
// So a commit in the sandbox cannot load the key, unless `sandbox.filesystem.allowRead` names it.
// The private key file stays denied, so a commit signs through the ssh-agent.
// The sandbox blocks Unix sockets, so the folder of the agent socket goes to `sandbox.network.allowUnixSockets`.
// Checked with `srt` 0.0.79: with only the `.pub` file and no socket, the commit fails, and with the socket folder, it is signed.
// On macOS, the folder of the launchd agent socket changes at each boot, so the drift check names an entry that is stale.
// This file is in the import graph of the hooks module through `settings.ts`, so it has no `node:` import.

import { mergeSettings } from "./merge.ts";
import type { Change, Json } from "./types.ts";

/**
 * The path that `value` of `user.signingkey` names, or `undefined`.
 * A key file has a path that starts with `~/` or `/`.
 * `allowRead` must name only the public key, so a path that does not end in `.pub` gives its `.pub` sibling.
 * So `allowRead` never names the private key file.
 * A literal key (`key::...` or `ssh-ed25519 ...`) and a GPG key ID name no file.
 */
export const signingKeyPath = (
  value: string | undefined,
): string | undefined => {
  const path = value?.trim();
  if (!path || !(path.startsWith("~/") || path.startsWith("/")))
    return undefined;
  return path.endsWith(".pub") ? path : `${path}.pub`;
};

/** The folder of the agent socket `socket` (the value of `SSH_AUTH_SOCK`), or `undefined` for no absolute path. */
export const agentSocketDir = (
  socket: string | undefined,
): string | undefined => {
  const path = socket?.trim();
  if (!path?.startsWith("/")) return undefined;
  return path.slice(0, path.lastIndexOf("/")) || undefined;
};

/**
 * `current` with the file of the signing key in `sandbox.filesystem.allowRead`,
 * and the folder of the agent socket `socket` in `sandbox.network.allowUnixSockets`, with one change line for each missing entry.
 * `current` is unchanged when `value` names no file.
 */
export const planSigningKey = (
  current: Json,
  value: string | undefined,
  changes: Change[],
  socket?: string,
): Json => {
  const path = signingKeyPath(value);
  if (!path) return current;
  const dir = agentSocketDir(socket);
  return mergeSettings(
    current,
    {
      sandbox: {
        filesystem: { allowRead: [path] },
        ...(dir ? { network: { allowUnixSockets: [dir] } } : {}),
      },
    },
    "",
    changes,
  ).settings;
};

/** The folders of the launchd agent sockets of macOS, which change at each boot. */
const LAUNCHD_SOCKETS = /\/var\/run\/com\.apple\.launchd\.[^/]+$/;

/**
 * The launchd agent socket folders that `settings` allow and that are not the folder of `socket`.
 * Then a signed commit in the sandbox cannot reach the agent.
 */
export const staleAgentSockets = (
  settings: Json,
  socket: string | undefined,
): string[] => {
  const dir = agentSocketDir(socket);
  const sandbox = settings["sandbox"] as
    | { network?: { allowUnixSockets?: unknown } }
    | undefined;
  const allowed = sandbox?.network?.allowUnixSockets;
  if (!dir || !Array.isArray(allowed) || allowed.includes(dir)) return [];
  return allowed.filter(
    (e): e is string => typeof e === "string" && LAUNCHD_SOCKETS.test(e),
  );
};

/** True when `staleAgentSockets` finds a folder. */
export const staleAgentSocket = (
  settings: Json,
  socket: string | undefined,
): boolean => staleAgentSockets(settings, socket).length > 0;
