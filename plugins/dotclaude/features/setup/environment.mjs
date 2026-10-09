// The report-only part of setup: OpenSpec, the language servers, and the old managed file.
// It writes nothing and runs no command that changes the computer.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { removeCommand } from "./managed.mjs";
import { lspPlugins, OPENSPEC_MIN, olderThan } from "./rules.mjs";

/** Run `cmd`, and return its trimmed output, or null when it fails. */
export const run = (cmd) => {
  try {
    const r = spawnSync(cmd[0], cmd.slice(1), {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return r.status === 0 ? r.stdout.trim() : null;
  } catch {
    return null;
  }
};

/** Print the OpenSpec state of the computer and of `projectDir`. */
export function reportOpenSpec(projectDir) {
  const openspec = run(["openspec", "--version"]);
  const node = run(["node", "--version"])?.replace(/^v/, "");
  console.log("\nOpenSpec:");
  if (!openspec) console.log("  openspec: not found");
  else if (olderThan(openspec, OPENSPEC_MIN))
    console.log(`  openspec: ${openspec}, older than ${OPENSPEC_MIN}`);
  else console.log(`  openspec: ${openspec}`);
  console.log(
    `  node: ${node ?? "not found"}${node && olderThan(node, "20.19.0") ? ", older than 20.19.0" : ""}`,
  );
  console.log(
    `  project: ${fs.existsSync(path.join(projectDir, "openspec")) ? "initialized" : "not initialized"} (${projectDir})`,
  );
}

/** Print the LSP plugin commands for the language servers on PATH. `readJson` gives a parsed file or its fallback. */
export function reportLsp(configDir, userSettings, readJson) {
  // A bad marketplace manifest only hides the LSP list, so it does not stop the settings merge.
  let marketplace = {};
  try {
    marketplace = JSON.parse(
      fs.readFileSync(
        path.join(
          configDir,
          "plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json",
        ),
        "utf8",
      ),
    );
  } catch {}
  const lsp = lspPlugins(
    (bin) => run([process.platform === "win32" ? "where" : "which", bin]),
    marketplace,
    readJson(path.join(configDir, "plugins", "installed_plugins.json"), {}),
    userSettings.enabledPlugins,
  );
  if (!lsp.length) return;
  console.log(
    "\nLanguage servers on PATH with no enabled LSP plugin. Run each:",
  );
  for (const command of lsp) console.log(`  ${command}`);
}

/** Print what setup found in the old managed file, and the removal command. */
export function reportManaged(old, moving) {
  if (!old) return;
  console.log(`\nOld dotclaude managed settings file: ${old.file}`);
  console.log(
    moving
      ? "Its keys move into user settings (see the diff above)."
      : "Question: move its keys into your user settings? To move them, run again with --move-managed.",
  );
  console.log(
    "Setup never changes a managed file. To remove it, run this command yourself:",
  );
  console.log(`  ${removeCommand(old.file)}`);
}
