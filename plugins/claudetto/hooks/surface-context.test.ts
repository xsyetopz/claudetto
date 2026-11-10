import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { scanned } from "./secrets.mock.ts";
import { BUN_FACT, INTERVIEW_TEXT, planModeText } from "./texts.ts";

const ENGINE = { kind: "engine" } as const;
const LONG_REMINDER = "stock plan mode text ".repeat(300);

const planAttachment = async (
	$: Engine,
	on: On,
	text: string,
	detail?: { reminder: "full" | "sparse"; hasPlan: boolean },
) => {
	on("prompt.attachment", (_$, e) => ({ text: e.text }));
	const out = await $.prompt.attachment({
		type: "plan_mode",
		text,
		origin: ENGINE,
		...(detail === undefined
			? {}
			: { detail: { ...detail, planFilePath: "/plans/a.md" } }),
	});
	return out.text;
};

test("the full plan mode reminder is replaced by a shorter one naming the plan file", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER, {
		reminder: "full",
		hasPlan: false,
	});

	expect(text).toBe(planModeText("/plans/a.md", false));
	expect(text?.length).toBeLessThan(LONG_REMINDER.length);
});

test("a plan file that already holds a plan is read before it is edited", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER, {
		reminder: "full",
		hasPlan: true,
	});

	expect(text).toBe(planModeText("/plans/a.md", true));
});

test("the sparse reminder is kept", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER, {
		reminder: "sparse",
		hasPlan: false,
	});

	expect(text).toBe(LONG_REMINDER);
});

test("an engine plan mode text shorter than ours is kept", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, "Plan.", {
		reminder: "full",
		hasPlan: false,
	});

	expect(text).toBe("Plan.");
});

test("a plan mode row without its facts is kept", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER);

	expect(text).toBe(LONG_REMINDER);
});

test("another attachment is passed on unchanged", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => ({ text: e.text }));

	const out = await $.prompt.attachment({
		type: "skill_listing",
		text: LONG_REMINDER,
		origin: ENGINE,
	});

	expect(out.text).toBe(LONG_REMINDER);
});

const skillText = async ($: Engine, on: On, skill: string, source: string) => {
	on("skill.prompt", (_$, e) => e);
	const out = await $.skill.prompt({
		skill,
		text: "stock text",
		source: source === "built-in" ? "built-in" : "user",
	});
	return out.text;
};

test("the built-in init skill reaches the model as the interview", async ($: Engine, on: On) => {
	expect(await skillText($, on, "init", "built-in")).toBe(INTERVIEW_TEXT);
});

test("a user's own skill named init keeps its text", async ($: Engine, on: On) => {
	expect(await skillText($, on, "init", "user")).toBe("stock text");
});

test("another built-in skill keeps its text", async ($: Engine, on: On) => {
	expect(await skillText($, on, "review", "built-in")).toBe("stock text");
});

/** The stubs a SessionStart needs beneath the whole plugin. */
const startLab = (on: On, files: readonly string[]) => {
	mock.store(on, {});
	on("classic.SessionStart", () => ({}));
	on("session.version", () => ({
		value: {
			version: "2.1.318",
			base: "2.1.318",
			builtAt: "2026-10-30T00:00:00Z",
		},
	}));
	on("env.get", () => ({ value: undefined }));
	on("session.id", () => ({ value: "s-1" }));
	on("session.root", () => ({ value: "/repo" }));
	on("settings.read", () => ({ value: {} }));
	on("fs.exists", (_$, e) => ({ value: files.includes(e.path) }));
	on(
		"process.run",
		(_$, e) =>
			scanned(e) ?? {
				value: {
					exitCode: 0,
					stdout: "",
					stderr: "",
					isStdoutTruncated: false,
					isStderrTruncated: false,
				},
			},
	);
};

const bunContext = async (
	$: Engine,
	source: "startup" | "clear" | "compact",
) => {
	const out = await $.classic.SessionStart({ source, cwd: "/repo" });
	return out.additionalContext ?? [];
};

const BUN_FILES = ["/repo/package.json", "/repo/bun.lock"];

test("a folder with package.json and bun.lock adds the bun text, again after clear and compact", async ($: Engine, on: On) => {
	startLab(on, BUN_FILES);

	expect(await bunContext($, "startup")).toContain(BUN_FACT);
	expect(await bunContext($, "clear")).toContain(BUN_FACT);
	expect(await bunContext($, "compact")).toContain(BUN_FACT);
});

for (const files of [["/repo/package.json"], ["/repo/bun.lock"]]) {
	test(`a folder with only ${files[0]?.slice(6)} adds nothing`, async ($: Engine, on: On) => {
		startLab(on, files);

		expect(await bunContext($, "startup")).not.toContain(BUN_FACT);
	});
}

test(
	"with bunRuleEnabled off, nothing is added",
	{ options: { bunRuleEnabled: false } },
	async ($: Engine, on: On) => {
		startLab(on, BUN_FILES);

		expect(await bunContext($, "startup")).not.toContain(BUN_FACT);
	},
);
