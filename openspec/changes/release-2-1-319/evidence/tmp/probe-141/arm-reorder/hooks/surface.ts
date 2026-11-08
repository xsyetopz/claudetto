import type { HookFor, On, PluginOptions } from "claude-code";
import { switchOption } from "./options.ts";
import {
	BUN_FACT,
	INTERVIEW_TEXT,
	offCommandText,
	planModeText,
	REFUSAL,
	ROOT_PROMPT,
	TOOL_TEXTS,
} from "./texts.ts";

// Read, Write, and Skill are called by name, so the model needs no schema for them (task 5.21). ListAgents serves only SendMessage, which is deferred, and one ToolSearch call loads both. Workflow, ScheduleWakeup, and ReportFindings go uncalled in 1.8's transcripts (task 2.13); setup denies them, and a session without setup still sends them in full.
export const DEFERRED_TOOLS: readonly string[] = [
	"Read",
	"Write",
	"Skill",
	"ListAgents",
	"Workflow",
	"ScheduleWakeup",
	"ReportFindings",
];

const LOCK_FILES: ReadonlySet<string> = new Set([
	"bun.lock",
	"bun.lockb",
	"package-lock.json",
	"npm-shrinkwrap.json",
	"pnpm-lock.yaml",
	"yarn.lock",
	"deno.lock",
	"Cargo.lock",
	"Gemfile.lock",
	"poetry.lock",
	"uv.lock",
	"Pipfile.lock",
	"composer.lock",
	"Package.resolved",
	"go.sum",
	"packages.lock.json",
	"conan.lock",
	"gradle.lockfile",
	"flake.lock",
]);

// `build/`, `dist/`, `target/`, `bin/`, and `obj/` are left out: projects name source folders so, and a false denial costs more than a whole read.
const GENERATED_FOLDERS: ReadonlySet<string> = new Set([
	"node_modules",
	".next",
	"DerivedData",
	".build",
	"__pycache__",
	".venv",
	".gradle",
	".tox",
	".mypy_cache",
	".ruff_cache",
	".pytest_cache",
]);

const GENERATED_SUFFIXES = [".min.js", ".min.css", ".map"];

const heavyFile = (path: string): boolean => {
	const segments = path.replaceAll("\\", "/").split("/");
	const name = segments.at(-1) ?? "";
	return (
		LOCK_FILES.has(name) ||
		GENERATED_SUFFIXES.some((suffix) => name.endsWith(suffix)) ||
		segments.slice(0, -1).some((segment) => GENERATED_FOLDERS.has(segment))
	);
};

export const OFF_COMMANDS: readonly string[] = [
	"add-dir",
	"agents",
	"autocompact",
	"background",
	"branch",
	"bug",
	"cd",
	"compact",
	"fast",
	"feedback",
	"focus",
	"ide",
	"memory",
	"mobile",
	"passes",
	"plan",
	"powerup",
	"pro-trial-expired",
	"radio",
	"recap",
	"release-notes",
	"setup-bedrock",
	"setup-vertex",
	"stickers",
	"workflows",
	"__remote-workflow",
	"workflow-launch-exec",
];

export const OFF_SKILLS: readonly string[] = [
	"batch",
	"simplify",
	"security-review",
	"code-review",
	"deep-research",
	"debug",
	"run",
	"verify",
	"insights",
	"team-onboarding",
	"fewer-permission-prompts",
	"run-skill-generator",
	"dataviz",
	"claude-api",
	"update-config",
	"workflow-authoring",
	"keybindings-help",
	"plugin-authoring",
];

// A skill or command the user or project holds under the same name stays on.
export const skillOverridesFor = (
	held: ReadonlySet<string>,
): Record<string, "off"> =>
	Object.fromEntries(
		OFF_SKILLS.filter((name) => !held.has(name)).map((name) => [name, "off"]),
	);

type SettingsContext = Parameters<HookFor<"settings.read">>[0];

const namesIn = async ($: SettingsContext, dir: string): Promise<string[]> => {
	try {
		const entries = await $.fs.list(dir);
		return entries.map((entry) =>
			entry.kind === "file" && entry.name.endsWith(".md")
				? entry.name.slice(0, -".md".length)
				: entry.name,
		);
	} catch {
		return [];
	}
};

// The engine does not wait for this hook before the first request, so it makes four parallel `$.fs.list` calls and nothing else.
const onSettingsRead: HookFor<"settings.read"> = async ($, e, next) => {
	const answer = await next(e);
	if (e.source !== undefined || answer.value === undefined) {
		return answer;
	}
	const config =
		(await $.env.get("CLAUDE_CONFIG_DIR")) ??
		`${await $.env.get("HOME")}/.claude`;
	const held = new Set(
		(
			await Promise.all([
				namesIn($, ".claude/skills"),
				namesIn($, ".claude/commands"),
				namesIn($, `${config}/skills`),
				namesIn($, `${config}/commands`),
			])
		).flat(),
	);
	const own = answer.value["skillOverrides"];
	return {
		...answer,
		value: {
			...answer.value,
			skillOverrides: {
				...skillOverridesFor(held),
				...(typeof own === "object" && own !== null ? own : {}),
			},
		},
	};
};

export const surface = (on: On, options: PluginOptions): void => {
	on("prompt.compose", () => ({
		sections: [{ id: "claudetto:root", text: ROOT_PROMPT, scope: "shared" }],
	}));

	on(
		"tool.describe",
		{ tool: [...new Set([...Object.keys(TOOL_TEXTS), ...DEFERRED_TOOLS])] },
		async (_$, e, next) => {
			const answer = await next(e);
			const ours = TOOL_TEXTS[e.tool] ?? answer.description;
			const description =
				ours.length < answer.description.length ? ours : answer.description;
			return DEFERRED_TOOLS.includes(e.tool)
				? { ...answer, description, isDeferred: true }
				: { ...answer, description };
		},
	);

	on("prompt.attachment", { type: "plan_mode" }, async (_$, e, next) => {
		const answer = await next(e);
		if (
			answer.text === null ||
			e.type !== "plan_mode" ||
			e.detail?.reminder !== "full"
		) {
			return answer;
		}
		const ours = planModeText(e.detail.planFilePath, e.detail.hasPlan);
		return ours.length < answer.text.length
			? { ...answer, text: ours }
			: answer;
	});

	// A user's own skill named `init` is theirs to keep, so only the built-in is replaced.
	on("skill.prompt", { skill: "init" }, (_$, e, next) =>
		e.source === "built-in" ? { text: INTERVIEW_TEXT } : next(e),
	);

	on(
		"classic.SessionStart",
		{ source: ["startup", "clear", "compact"] },
		async ($, e, next) => {
			const answer = await next(e);
			if (!switchOption(options, "bunRuleEnabled") || e.cwd === undefined) {
				return answer;
			}
			const [manifest, lock] = await Promise.all([
				$.fs.exists(`${e.cwd}/package.json`),
				$.fs.exists(`${e.cwd}/bun.lock`),
			]);
			return manifest && lock
				? {
						...answer,
						additionalContext: [...(answer.additionalContext ?? []), BUN_FACT],
					}
				: answer;
		},
	);

	on("tool.call", { tool: "Read" }, (_$, e, next) =>
		switchOption(options, "readGuardEnabled") &&
		e.limit === undefined &&
		heavyFile(e.file_path)
			? { deny: REFUSAL }
			: next(e),
	);

	on("settings.read", onSettingsRead);

	// The handover compacts through `$.command.run`, which runs every hook but the caller's own, so a plugin's run goes on.
	on("command.run", { command: [...OFF_COMMANDS] }, (_$, e, next) =>
		e.origin.kind === "plugin" ? next(e) : { text: offCommandText(e.command) },
	);
	on(
		"command.describe",
		{ command: [...OFF_COMMANDS] },
		async (_$, e, next) => ({ ...(await next(e)), isHidden: true }),
	);
};
