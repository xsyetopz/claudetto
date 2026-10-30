import { expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { statusOf, subagentsOf } from "../main.ts";
import { NOW, NOW_S } from "./support.ts";

const DIR = join(import.meta.dir, "..");
const BIN = join(DIR, "../../bin/claudetto-statusline");

/** What a line that reads only its stdin never names: files, the network, a child process, the clock of a shell. */
const FORBIDDEN: readonly RegExp[] = [
	/node:(?:fs|child_process|net|http|https|dgram|dns|tls|worker_threads|os|path)/,
	/from "(?:fs|child_process|net|http|https)"/,
	/\bfetch\s*\(/,
	/\bWebSocket\b/,
	/\bBun\.(?:spawn|spawnSync|file|write|\$|connect|listen|serve|fetch|env\.)/,
	/\bBun\.(?:readableStreamTo|openInEditor)/,
	/\bprocess\.(?:binding|dlopen|kill|chdir)/,
	/\bimport\s*\(/,
	/\brequire\s*\(/,
	/\beval\s*\(/,
];

const sources = async (): Promise<{ name: string; text: string }[]> => {
	const names = (await readdir(DIR)).filter((name) => name.endsWith(".ts"));
	const files = await Promise.all(
		names.map(async (name) => ({
			name,
			text: await readFile(join(DIR, name), "utf8"),
		})),
	);
	return [
		...files,
		{ name: "bin/claudetto-statusline", text: await readFile(BIN, "utf8") },
	];
};

test("no source of the line names a file, network, or process call", async () => {
	const hits = (await sources()).flatMap(({ name, text }) =>
		text
			.split("\n")
			.filter((line) => !line.trimStart().startsWith("//"))
			.flatMap((line) =>
				FORBIDDEN.filter((pattern) => pattern.test(line)).map(
					(pattern) => `${name}: ${line.trim()} (${pattern})`,
				),
			),
	);
	expect(hits).toEqual([]);
});

test("a render that calls `fetch`, `Bun.spawn`, `Bun.file`, or `Bun.write` fails the test", () => {
	const calls: string[] = [];
	const trap = (name: string) => () => {
		calls.push(name);
		throw new Error(name);
	};
	const savedFetch = globalThis.fetch;
	const saved = {
		spawn: globalThis.Bun.spawn,
		spawnSync: globalThis.Bun.spawnSync,
		file: globalThis.Bun.file,
		write: globalThis.Bun.write,
	};
	Object.assign(globalThis, { fetch: trap("fetch") });
	Object.assign(globalThis.Bun, {
		spawn: trap("spawn"),
		spawnSync: trap("spawnSync"),
		file: trap("file"),
		write: trap("write"),
	});
	try {
		const input = JSON.stringify({
			workspace: { current_dir: "/a/b" },
			model: { display_name: "Opus 5.5" },
			rate_limits: {
				five_hour: { used_percentage: 5, resets_at: NOW_S + 600 },
			},
			prompt_cache: {
				warm: true,
				caching_observed: true,
				ttl: "5m",
				expires_at: NOW_S + 60,
			},
		});
		expect(statusOf(input, { COLUMNS: "100" }, NOW).length).toBeGreaterThan(0);
		expect(
			subagentsOf(
				JSON.stringify({
					tasks: [
						{ id: "t", name: "x", status: "running", startTime: NOW - 5000 },
					],
				}),
				{ COLUMNS: "100" },
				NOW,
			),
		).toContain('"id":"t"');
	} finally {
		Object.assign(globalThis, { fetch: savedFetch });
		Object.assign(globalThis.Bun, saved);
	}
	expect(calls).toEqual([]);
});
