import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "bun";
import { launchFakeApi } from "../launch.ts";

const CLIENT_LIMIT_S = 2;
const BLOCK_MS = 3000;

describe("the fake API launcher", () => {
	test("answers a client while the launcher's own event loop is blocked, as `spawnSync` blocks it", async () => {
		const bodies = path.join(
			await mkdtemp(path.join(tmpdir(), "launch-")),
			"b.jsonl",
		);
		const fake = await launchFakeApi({ bodies, text: "hello" });
		try {
			const client = spawn(
				[
					"curl",
					"-s",
					"-m",
					String(CLIENT_LIMIT_S),
					"-d",
					'{"stream":false}',
					`${fake.url}/v1/messages`,
				],
				{ stdout: "pipe" },
			);
			// A fake in this process could not answer before the client gives up.
			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, BLOCK_MS);
			await client.exited;
			expect(await new Response(client.stdout).text()).toContain("hello");
			expect(await readFile(bodies, "utf8")).toBe('{"stream":false}\n');
		} finally {
			await fake.stop();
		}
	});

	test("stops the process by its pid", async () => {
		const fake = await launchFakeApi();
		expect(fake.pid).toBeGreaterThan(0);
		await fake.stop();
		expect(() => process.kill(fake.pid, 0)).toThrow();
	});
});
