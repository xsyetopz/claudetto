import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "bun";

const PTY = join(import.meta.dir, "..", "pty.py");

// Claude Code writes to its terminal while it exits, so a child that does the same on `SIGTERM` stands in for it.
const CHILD = `
import signal, sys, time
def bye(*_):
    sys.stdout.write("x" * 200000 + "BYE")
    sys.stdout.flush()
    sys.exit(0)
signal.signal(signal.SIGTERM, bye)
time.sleep(60)
`;

test("the deadline ends a child that writes to its terminal on SIGTERM", async () => {
	const dir = await mkdtemp(join(tmpdir(), "pty-spec-"));
	try {
		const capture = join(dir, "capture.txt");
		const started = Date.now();
		const run = spawn(
			["python3", "-I", PTY, capture, "1", "python3", "-I", "-c", CHILD],
			{ stdio: ["ignore", "ignore", "inherit"] },
		);
		const late = setTimeout(() => run.kill("SIGKILL"), 15_000);
		await run.exited;
		clearTimeout(late);
		expect(Date.now() - started).toBeLessThan(15_000);
		expect(await readFile(capture, "utf8")).toEndWith("BYE");
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}, 20_000);
