// The install step of the setup command: the exact command is shown, and it runs only after a yes.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { answering, processResult, run, storeStub } from "./support.ts";

const FILE = "/home/u/.claude/settings.json";
const ASK = "is not installed";
const DISMISS = "dismiss";

interface Lab {
	readonly asked: string[];
	readonly ran: string[];
	readonly stored: Map<string, unknown>;
}

interface Machine {
	readonly system: string;
	readonly machine: string;
	/** Files that exist, besides the settings file. */
	readonly present: readonly string[];
}

const BREW: Machine = {
	system: "Darwin",
	machine: "arm64",
	present: ["/opt/bin/brew"],
};

/** A machine with `PATH` of `/opt/bin`, outside a repo, and an `answer` to the install question. */
const lab = (on: On, machine: Machine, answer: string): Lab => {
	const state: Lab = { asked: [], ran: [], stored: new Map() };
	on("session.cwd", () => ({ value: "/r" }));
	on("env.get", (_$, e) => ({
		value: { HOME: "/home/u", PATH: "/opt/bin" }[e.name],
	}));
	on("fs.exists", (_$, e) => ({
		value: e.path === FILE || machine.present.includes(e.path),
	}));
	on("fs.read", () => ({ value: "{}" }));
	storeStub(on, state.stored);
	on("process.run", (_$, e) => {
		const line = e.argv.join(" ");
		const outputs: Record<string, string> = {
			"uname -s": `${machine.system}\n`,
			"uname -m": `${machine.machine}\n`,
		};
		const stdout = outputs[line] ?? "";
		if (e.argv[0] !== "git" && !(line in outputs)) {
			state.ran.push(line);
		}
		return processResult(stdout, e.argv[0] === "git" ? 128 : 0);
	});
	answering(on, state.asked, (q) => {
		if (!q.includes(ASK)) {
			return "Skip";
		}
		if (answer === DISMISS) {
			throw new Error("dismissed");
		}
		return answer;
	});
	return state;
};

test("a Yes shows the `brew` command and then runs it", async ($: Engine, on: On) => {
	const state = lab(on, BREW, "Yes");

	const text = await run($);

	expect(state.asked.find((q) => q.includes(ASK))).toContain(
		"`brew install ast-grep`",
	);
	expect(state.ran).toEqual(["brew install ast-grep"]);
	expect(text).toContain("Ran `brew install ast-grep`.");
	expect(state.stored.size).toBe(0);
});

test("a No runs nothing and records the pinned version", async ($: Engine, on: On) => {
	const state = lab(on, BREW, "No");

	const text = await run($);

	expect(state.ran).toEqual([]);
	expect(state.stored.get("optional-tool:ast-grep")).toBe("0.51.1");
	expect(text).toContain("The launch notice stays quiet.");
});

test("a dismissed question runs nothing and records nothing", async ($: Engine, on: On) => {
	const state = lab(on, BREW, DISMISS);

	const text = await run($);

	expect(state.ran).toEqual([]);
	expect(state.stored.size).toBe(0);
	expect(text).toContain("Ran nothing for `ast-grep`");
});

test("a platform with no package manager gets the zip and the folder, and nothing runs", async ($: Engine, on: On) => {
	const state = lab(
		on,
		{ system: "Linux", machine: "x86_64", present: [] },
		"Yes",
	);

	const text = await run($);

	expect(state.asked.filter((q) => q.includes(ASK))).toEqual([]);
	expect(state.ran).toEqual([]);
	expect(text).toContain("app-x86_64-unknown-linux-gnu.zip to ~/.local/bin");
});

test("an Intel Mac with `brew` gets the zip, since 0.51.1 has no bottle there", async ($: Engine, on: On) => {
	const state = lab(on, { ...BREW, machine: "x86_64" }, "Yes");

	const text = await run($);

	expect(state.ran).toEqual([]);
	expect(text).toContain("app-x86_64-apple-darwin.zip");
});

test("`ast-grep` on the `PATH` asks and says nothing", async ($: Engine, on: On) => {
	const state = lab(
		on,
		{ ...BREW, present: ["/opt/bin/brew", "/opt/bin/ast-grep"] },
		"Yes",
	);

	const text = await run($);

	expect(state.asked.filter((q) => q.includes(ASK))).toEqual([]);
	expect(text).not.toContain("ast-grep");
});
