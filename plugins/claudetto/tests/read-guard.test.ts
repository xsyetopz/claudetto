import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const lab = (on: On): void => {
	// The gate block reads these on every call; the engine's own check allows.
	on("tool.check", () => ({ decision: "allow" }));
	on("env.get", () => ({ value: undefined }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.root", () => ({ value: "/repo" }));
	on("fs.read", () => ({ value: "x" }));
	on("fs.exists", () => ({ value: true }));
	mock.store(on);
	mock.clock(on, { now: 1 });
	on("tool.call", { tool: "Read" }, () => ({ result: "read" }));
};

test("a whole `Read` of a lock file is denied with the way out", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.tool.call({ tool: "Read", file_path: "/repo/bun.lock" });

	expect(out.result).toBeUndefined();
	expect(out.deny).toContain("`limit`");
});

test("a `Read` of a lock file with a `limit` goes on", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.tool.call({
		tool: "Read",
		file_path: "/repo/bun.lock",
		limit: 50,
	});

	expect(out.result).toBe("read");
});

test("a `Read` of a source file goes on", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.tool.call({ tool: "Read", file_path: "/repo/src/a.ts" });

	expect(out.result).toBe("read");
});

test(
	"with `readGuardEnabled` off, a whole `Read` of a lock file goes on",
	{ options: { readGuardEnabled: false } },
	async ($: Engine, on: On) => {
		lab(on);

		const out = await $.tool.call({
			tool: "Read",
			file_path: "/repo/bun.lock",
		});

		expect(out.result).toBe("read");
	},
);
