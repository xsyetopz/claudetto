// Installs plugins of this checkout into a new sandbox config with the `claude plugin` CLI, as a user installs them (`just sandbox-install`).
// The checkout is a local marketplace, so Claude Code reads each plugin from its folder.
// An edit takes effect after `just generate`, at the next session start or `/reload-plugins`.
// The arguments are the names of the plugins to install, and with none the script installs `dotclaude`.
// Then the script starts Claude Code in the sandbox. `just sandbox-installed` starts it again with no new install.

import path from "node:path";
import { $ } from "bun";
import { must, REPO, recipe } from "../recipes.ts";

/** The sandbox folder of the install, apart from `just sandbox` and `just sandbox-alone`. */
const INSTALL_DIR = "/tmp/dotclaude-sandbox-install";

const bin = path.join("plugins", "dotclaude-lab", "bin", "dotclaude-sandbox");

/** Runs `dotclaude-sandbox` in the install folder with `args`. */
const sandbox = (args: string[]) =>
  must($`bun ${bin} --dir ${INSTALL_DIR} ${args}`);

await recipe(async () => {
  const names = Bun.argv.slice(2);
  await sandbox(["--clean"]);
  await sandbox(["plugin", "marketplace", "add", REPO]);
  for (const name of names.length > 0 ? names : ["dotclaude"])
    await sandbox(["plugin", "install", `${name}@dotclaude`]);
  console.log(
    "Next: run `/dotclaude:setup` in the session, then `/exit`, then `just sandbox-installed`.",
  );
  // The session is interactive, so it gets the terminal of this process.
  const child = Bun.spawn(["bun", bin, "--dir", INSTALL_DIR], {
    cwd: REPO,
    stdio: ["inherit", "inherit", "inherit"],
  });
  process.exit(await child.exited);
});
