// Loaded by the `preload` of `bunfig.toml` once per `bun test` process.
// Every temporary folder that the tests or the hooks they spawn create goes under
// one folder per process, so repeated runs leave nothing behind in the system temp folder.

import { afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "bun";

const root = await mkdtemp(path.join(os.tmpdir(), "claudetto-tests-"));
process.env["TMPDIR"] = root;
/** The script of the child that waits until the process `pid` exits and then removes the folder `dir`. */
const REMOVE_AFTER_EXIT = `
const [dir, pid] = process.argv.slice(-2);
const alive = () => { try { process.kill(Number(pid), 0); return true; } catch { return false; } };
while (alive()) await Bun.sleep(50);
require("node:fs").rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
`;

// `bun test` does not emit a `process` `exit` event, so `afterAll` starts the removal.
// The hook runs once, after the last test file of the process.
// A remove of thousands of files can take more than the hook timeout, and it can fail on a file that this process still holds open.
// So a detached child removes the folder after this process exits, and the hook returns at once.
afterAll(async () => {
	try {
		spawn(
			[process.execPath, "-e", REMOVE_AFTER_EXIT, root, String(process.pid)],
			{ stdio: ["ignore", "ignore", "ignore"], detached: true },
		).unref();
	} catch {
		await rm(root, { recursive: true, force: true });
	}
});
