import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { storeStub } from "./setup-command/support.ts";

interface Lab {
	lines: string[];
	stored: Map<string, unknown>;
}

const PATH = "/bin:/opt/tools";

const lab = (on: On, present: readonly string[], seen?: string): Lab => {
	const state: Lab = { lines: [], stored: new Map() };
	if (seen !== undefined) {
		state.stored.set("optional-tool:ast-grep", seen);
	}
	on("env.get", (_$, e) => ({ value: e.name === "PATH" ? PATH : undefined }));
	on("fs.exists", (_$, e) => ({
		value: present.some(
			(name) => e.path.endsWith(`/${name}`) || e.path.endsWith(`\\${name}`),
		),
	}));
	storeStub(on, state.stored);
	on("ui.log", (_$, e) => {
		state.lines.push(e.text);
		return { value: undefined };
	});
	on("session.version", () => ({
		value: {
			version: "2.1.314",
			base: "2.1.314",
			builtAt: "2026-10-30T00:00:00Z",
		},
	}));
	on("session.id", () => ({ value: "s" }));
	on("session.root", () => ({ value: "/repo" }));
	on("classic.SessionStart", () => ({}));
	return state;
};

test("a startup without `ast-grep` logs one line naming the install and `/claudetto:setup`", async ($: Engine, on: On) => {
	const state = lab(on, []);

	await $.classic.SessionStart({ source: "startup" });

	const lines = state.lines.filter((line) => line.includes("ast-grep"));
	expect(lines).toHaveLength(1);
	expect(lines[0]).toContain("/claudetto:setup");
	expect(state.stored.get("optional-tool:ast-grep")).toBe("0.51.1");
});

test("a second launch logs nothing", async ($: Engine, on: On) => {
	const state = lab(on, []);

	await $.classic.SessionStart({ source: "startup" });
	state.lines.length = 0;
	await $.classic.SessionStart({ source: "startup" });

	expect(state.lines.filter((line) => line.includes("ast-grep"))).toEqual([]);
});

test("a changed pin shows the line again", async ($: Engine, on: On) => {
	const state = lab(on, [], "0.50.0");

	await $.classic.SessionStart({ source: "startup" });

	expect(state.lines.filter((line) => line.includes("ast-grep"))).toHaveLength(
		1,
	);
});

test("`ast-grep` on the `PATH` logs nothing", async ($: Engine, on: On) => {
	const state = lab(on, ["ast-grep", "ast-grep.exe"]);

	await $.classic.SessionStart({ source: "startup" });

	expect(state.lines.filter((line) => line.includes("ast-grep"))).toEqual([]);
	expect(state.stored.size).toBe(0);
});

test(
	"with `missingToolNoticeEnabled` off, nothing is logged",
	{ options: { missingToolNoticeEnabled: false } },
	async ($: Engine, on: On) => {
		const state = lab(on, []);

		await $.classic.SessionStart({ source: "startup" });

		expect(state.lines.filter((line) => line.includes("ast-grep"))).toEqual([]);
	},
);

test("a resume logs nothing", async ($: Engine, on: On) => {
	const state = lab(on, []);

	await $.classic.SessionStart({ source: "resume" });

	expect(state.lines.filter((line) => line.includes("ast-grep"))).toEqual([]);
});
