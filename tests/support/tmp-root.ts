import { afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "bun";

const root = await mkdtemp(path.join(os.tmpdir(), "claudetto-tests-"));
process.env["TMPDIR"] = root;
const REMOVE_AFTER_EXIT = `
const [dir, pid] = process.argv.slice(-2);
const alive = () => { try { process.kill(Number(pid), 0); return true; } catch { return false; } };
while (alive()) await Bun.sleep(50);
require("node:fs").rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
`;

// `bun test` emits no `exit` event and a big remove can outlast the hook, so a detached child does it.
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
