import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listen } from "bun";
import type { CommandRunner } from "../../session/command.ts";
import { liveSocket, lsofCwds } from "../guards.ts";

let root = "";

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), "gc-guards-"));
});
afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

const answer =
	(code: number, stdout = ""): CommandRunner =>
	async () => ({ code, stdout, stderr: "", timedOut: false });

describe("liveSocket", () => {
	test("is live when `tmux has-session` succeeds", async () => {
		expect(await liveSocket(answer(0))(join(root, "x.sock"))).toBe(true);
	});

	test("is live when a server accepts a connect although `tmux` fails", async () => {
		const sock = join(root, "tmux.sock");
		const server = listen({ unix: sock, socket: { data: () => undefined } });

		expect(await liveSocket(answer(1))(sock)).toBe(true);

		server.stop(true);
	});

	test("is dead when `tmux` fails and nothing listens", async () => {
		expect(await liveSocket(answer(1))(join(root, "none.sock"))).toBe(false);
	});
});

describe("lsofCwds", () => {
	test("reads the paths from the output", async () => {
		const list = lsofCwds(
			answer(
				0,
				`p1
fcwd
n/a
`,
			),
		);

		expect(await list()).toEqual(["/a"]);
	});

	test("throws when `lsof` gives nothing and fails, so nothing is removed", async () => {
		await expect(lsofCwds(answer(1))()).rejects.toThrow("`lsof");
	});
});
