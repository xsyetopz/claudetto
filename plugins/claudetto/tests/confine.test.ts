import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const ON = { options: { confineEnabled: true } } as const;

interface Lab {
	readonly set: Record<string, string | undefined>;
	prefix: string | undefined;
	checkCode: number;
	checkText: string;
}

/** Records each `$.env.set`, and answers `$.env.get` of the prefix with what the lab holds. */
const lab = (on: On): Lab => {
	const state: Lab = {
		set: {},
		prefix: undefined,
		checkCode: 0,
		checkText: "",
	};
	on("env.set", (_$, e) => {
		state.set[e.name] = e.value;
		if (e.name === "CLAUDE_CODE_SHELL_PREFIX") {
			state.prefix = e.value;
		}
		return { value: {} };
	});
	on("env.get", (_$, e) => ({
		value: e.name === "CLAUDE_CODE_SHELL_PREFIX" ? state.prefix : undefined,
	}));
	// The gate block reads these on every `Bash` call; the engine's own check allows.
	mock.clock(on, { now: 0 });
	mock.store(on);
	on("session.root", () => ({ value: "/repo" }));
	on("fs.exists", () => ({ value: false }));
	on("fs.read", () => ({ value: "" }));
	on("session.cwd", () => ({ value: "/work" }));
	on("tool.check", () => ({ decision: "allow" }));
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	// The wrapper's `--check` answers from the lab; every other run is the gate's git probe, which fails.
	on("process.run", (_$, e) => {
		const checked = e.argv.includes("--check");
		return {
			value: {
				exitCode: checked ? state.checkCode : 1,
				stdout: "",
				stderr: checked ? state.checkText : "",
				isStdoutTruncated: false,
				isStderrTruncated: false,
			},
		};
	});
	on("tool.call", { tool: "Bash" }, () => ({ result: "ran" }));
	return state;
};

const start = ($: Engine) =>
	$.session.start({ cwd: "/work", surface: null, isInteractive: false });

test(
	"with `confineEnabled` on, the session start sets the shell prefix and the root",
	ON,
	async ($: Engine, on: On) => {
		const state = lab(on);

		await start($);

		expect(state.set["CLAUDE_CODE_SHELL_PREFIX"]).toEndWith(
			"/bin/claudetto-confine",
		);
		expect(state.set["CLAUDETTO_CONFINE_ROOT"]).toBe("/work");
	},
);

test(
	"the old `confine` option set to `on` still turns it on",
	{ options: { confine: "on" } },
	async ($: Engine, on: On) => {
		const state = lab(on);

		await start($);

		expect(state.set["CLAUDETTO_CONFINE_ROOT"]).toBe("/work");
	},
);

test(
	"with `confineEnabled` off, the session start sets nothing",
	{ options: { confineEnabled: false } },
	async ($: Engine, on: On) => {
		const state = lab(on);

		await start($);

		expect(state.set).toEqual({});
	},
);

test(
	"a `Bash` call goes on when the prefix is ours",
	ON,
	async ($: Engine, on: On) => {
		lab(on);
		await start($);

		const out = await $.tool.call({ tool: "Bash", command: "echo hi" });

		expect(out.result).toBe("ran");
	},
);

test(
	"a `Bash` call is refused, never run, when the prefix is not ours",
	ON,
	async ($: Engine, on: On) => {
		const state = lab(on);
		await start($);
		state.prefix = "/other/wrapper";

		const out = await $.tool.call({ tool: "Bash", command: "echo hi" });

		expect(out.result).toBeUndefined();
		expect(out.deny).toContain("`CLAUDE_CODE_SHELL_PREFIX`");
	},
);

test(
	"with `confineEnabled` off, a `Bash` call is left alone",
	{ options: { confineEnabled: false } },
	async ($: Engine, on: On) => {
		lab(on);

		const out = await $.tool.call({ tool: "Bash", command: "echo hi" });

		expect(out.result).toBe("ran");
	},
);

test(
	"a `Bash` call is refused, never run, with the reason the wrapper gives when its sandbox program is missing",
	ON,
	async ($: Engine, on: On) => {
		const state = lab(on);
		await start($);
		state.checkCode = 126;
		state.checkText =
			"claudetto-confine: `bwrap` is missing. The command was not run.\n";

		const out = await $.tool.call({ tool: "Bash", command: "echo hi" });

		expect(out.result).toBeUndefined();
		expect(out.deny).toBe(
			"claudetto-confine: `bwrap` is missing. The command was not run.",
		);
	},
);
