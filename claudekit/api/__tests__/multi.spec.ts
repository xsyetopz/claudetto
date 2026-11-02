import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, which } from "bun";
import { fakeApiEnv } from "../../session/env.ts";
import { startFakeApi } from "../fake.ts";

const results = (bodies: readonly string[]): string[] =>
	bodies
		.flatMap((raw) => JSON.parse(raw).messages)
		.flatMap((message: { content: unknown }) =>
			Array.isArray(message.content) ? message.content : [],
		)
		.filter((block: { type: string }) => block.type === "tool_result")
		.map((block: { content: string }) => block.content);

describe("the fake Messages API against `claude -p`", () => {
	test("gives every tool call of a list its result, not only the first", async () => {
		// Without `claude` on `PATH` there is no session to spawn.
		if (which("claude") === null) {
			return;
		}
		const root = await mkdtemp(join(tmpdir(), "multi-"));
		const config = join(root, "config");
		const work = join(root, "work");
		await mkdir(config);
		await mkdir(work);
		const api = startFakeApi(
			["echo one", "echo two", "echo three"].map((command) => ({
				name: "Bash",
				input: { command, description: "probe" },
			})),
		);

		const session = spawn(
			[
				"claude",
				"-p",
				"Run.",
				"--model",
				"claude-sonnet-5-5",
				"--settings",
				JSON.stringify({ permissions: { allow: ["Bash"] } }),
				"--output-format",
				"json",
				"--no-session-persistence",
			],
			{
				cwd: await realpath(work),
				env: { ...process.env, ...fakeApiEnv(api.url, config) },
				stdout: "pipe",
				stderr: "pipe",
			},
		);
		await new Response(session.stdout).text();
		await session.exited;
		await api.stop();

		expect(new Set(results(api.bodies))).toEqual(
			new Set(["one", "two", "three"]),
		);
	}, 20_000);
});
