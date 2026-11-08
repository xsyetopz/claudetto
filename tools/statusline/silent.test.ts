import { expect, test } from "bun:test";
import {
	statusOf,
	subagentsOf,
} from "../../plugins/claudetto/statusline/main.ts";
import { NOW, NOW_S } from "./support.ts";

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
