// The folder for the files of the status line and the context hook: one folder for each user, with mode `0700`.
// A shared temporary folder lets another user predict a file name, so the files go in this folder.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const userId = () => process.getuid?.() ?? os.userInfo().username;

/**
 * The folder `dotclaude-status-<user id>` in `base`, made with mode `0700`, or `undefined`.
 * An existing folder is used only when this user owns it and it is not a link, and its mode is set to `0700`.
 * Any error gives `undefined`, and the caller works with no file.
 */
export function privateDir(base = os.tmpdir()) {
  const dir = path.join(base, `dotclaude-status-${userId()}`);
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const info = fs.lstatSync(dir);
    if (
      !info.isDirectory() ||
      (info.uid !== undefined &&
        process.getuid &&
        info.uid !== process.getuid())
    )
      return undefined;
    if ((info.mode & 0o777) !== 0o700) fs.chmodSync(dir, 0o700);
    return dir;
  } catch {
    return undefined;
  }
}
