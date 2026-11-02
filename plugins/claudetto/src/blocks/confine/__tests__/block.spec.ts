import { describe, expect, test } from "bun:test";
import {
	type ConfineEngine,
	confineOn,
	failedGuard,
	refusal,
	startConfine,
} from "../block.ts";

/** A stand-in for the engine: an `env` map, a recorded `process.run`, and the result of the check. */
const engineOf = (
	root: string,
	env: Record<string, string> = {},
	check: { exitCode: number; stderr: string } = { exitCode: 0, stderr: "" },
) => {
	const vars = new Map(Object.entries(env));
	const ran: string[][] = [];
	const $: ConfineEngine = {
		plugin: { root },
		env: {
			get: (name) => Promise.resolve(vars.get(name)),
			set: (name, value) => Promise.resolve(vars.set(name, value)),
		},
		process: {
			run: (argv) => {
				ran.push(argv);
				return Promise.resolve(check);
			},
		},
	};
	return { $, vars, ran };
};

const ON = { confineEnabled: true };
const PREFIX = "/plugin/bin/claudetto-confine";

describe("confineOn", () => {
	test.each([
		[{ confineEnabled: true }, true],
		[{ confine: "on" }, true],
		[{ confineEnabled: false, confine: "off" }, false],
		[{ confineEnabled: "true" }, false],
		[{}, false],
	])("%j is %p", (options, expected) => {
		expect(confineOn(options)).toBe(expected);
	});
});

describe("startConfine", () => {
	test("sets the root and the prefix when on", async () => {
		const { $, vars } = engineOf("/plugin");

		await startConfine($, "/work", ON);

		expect(vars.get("CLAUDETTO_CONFINE_ROOT")).toBe("/work");
		expect(vars.get("CLAUDE_CODE_SHELL_PREFIX")).toBe(PREFIX);
	});

	test("sets them for the old option `confine: on` too", async () => {
		const { $, vars } = engineOf("/plugin");

		await startConfine($, "/work", { confine: "on" });

		expect(vars.get("CLAUDE_CODE_SHELL_PREFIX")).toBe(PREFIX);
	});

	test("sets nothing when off", async () => {
		const { $, vars } = engineOf("/plugin");

		await startConfine($, "/work", {});

		expect(vars.size).toBe(0);
	});

	test("quotes a plugin root with a space and a quote, so the shell reads one word", async () => {
		const { $, vars } = engineOf("/my plugin/it's");

		await startConfine($, "/work", ON);

		expect(vars.get("CLAUDE_CODE_SHELL_PREFIX")).toBe(
			"'/my plugin/it'\\''s/bin/claudetto-confine'",
		);
	});
});

describe("refusal", () => {
	test("is none when off, and runs no check", async () => {
		const { $, ran } = engineOf("/plugin");

		expect(await refusal($, {})).toBeUndefined();
		expect(ran).toEqual([]);
	});

	test("names a prefix that is not ours", async () => {
		const { $, ran } = engineOf("/plugin", {
			CLAUDE_CODE_SHELL_PREFIX: "/other",
		});

		const reason = await refusal($, ON);

		expect(reason).toContain("`CLAUDE_CODE_SHELL_PREFIX`");
		expect(ran).toEqual([]);
	});

	test("gives the error of a failed check", async () => {
		const { $, ran } = engineOf(
			"/plugin",
			{ CLAUDE_CODE_SHELL_PREFIX: PREFIX },
			{ exitCode: 126, stderr: " no sandbox \n" },
		);

		expect(await refusal($, ON)).toBe("no sandbox");
		expect(ran).toEqual([[PREFIX, "--check", "--"]]);
	});

	test("is none when the check passes", async () => {
		const { $ } = engineOf("/plugin", { CLAUDE_CODE_SHELL_PREFIX: PREFIX });

		expect(await refusal($, ON)).toBeUndefined();
	});

	test("accepts the quoted prefix of a plugin root with a space, and checks the bare path", async () => {
		const { $, ran } = engineOf("/my plugin", {
			CLAUDE_CODE_SHELL_PREFIX: "'/my plugin/bin/claudetto-confine'",
		});

		expect(await refusal($, ON)).toBeUndefined();
		expect(ran).toEqual([
			["/my plugin/bin/claudetto-confine", "--check", "--"],
		]);
	});
});

describe("failedGuard", () => {
	test("denies in place of a guard that failed when on", () => {
		expect(failedGuard(ON, false)).toContain("could not check the sandbox");
	});

	test("lets the call go on when off, or when the guard had called on", () => {
		expect(failedGuard({}, false)).toBeUndefined();
		expect(failedGuard(ON, true)).toBeUndefined();
	});
});
