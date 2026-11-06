import { createHash } from "node:crypto";
import { cp, mkdir, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import type { Run } from "../workspace/workspace.ts";
import { blockText } from "../shared/blocks.ts";
import { isRecord } from "../shared/record.ts";

const INLINE = /Loaded inline plugin from path: (\S+)/;
const REGISTER = /plugin\.register: (\S+) \(/;
const COUNT = /Loaded (\d+) (agents|skills|commands|output styles) from plugin (\S+) /;
const HOOKS = /hooks module (\S+) loaded \([^)]*\); events: (\S+)/;
const MODEL = /dispatching to \S+ model=(\S+)/;
const STYLE = /^# Output Style: (.+)$/m;
// A tool a Mod registers is sent deferred: its name rides in this list, one per line, not in `tools`.
const DEFERRED = /deferred tools are now available via ToolSearch[^\n]*\n((?:[^\n]+\n?)*)/;

export interface Patch {
	file: string;
	find: string;
	replace: string;
}

export interface Arm {
	name: string;
	plugins: { dir: string; patches?: Patch[] }[];
	settings?: Record<string, unknown>;
	env?: Record<string, string>;
	flags?: string[];
	model: string;
	expect: ArmExpect;
}

export interface ArmExpect {
	plugins?: string[];
	outputStyle?: string;
	agents?: Record<string, number>;
	skills?: Record<string, number>;
	commands?: Record<string, number>;
	hookEvents?: Record<string, string[]>;
	// The first request's `tools` names, in order; a tool that loads late, such as an account connector, fails it.
	tools?: string[];
	toolsInclude?: string[];
	toolsExclude?: string[];
	model?: string;
}

export interface Observed {
	plugins: string[];
	agents: Record<string, number>;
	skills: Record<string, number>;
	commands: Record<string, number>;
	hookEvents: Record<string, string[]>;
	model?: string | undefined;
	outputStyle?: string | undefined;
	tools: string[];
	deferredTools: string[];
}

export interface ArmCheck {
	ok: boolean;
	observed: Observed;
	diff: string[];
}

const COUNT_KEY = { agents: "agents", skills: "skills", commands: "commands" } as const;

export const observe = (debugLog: string, firstRequest: unknown): Observed => {
	const o: Observed = { plugins: [], agents: {}, skills: {}, commands: {}, hookEvents: {}, tools: [], deferredTools: [] };
	for (const line of debugLog.split("\n")) {
		const plugin = INLINE.exec(line)?.[1] ?? REGISTER.exec(line)?.[1];
		if (plugin && !o.plugins.includes(plugin)) {
			o.plugins.push(plugin);
		}
		const count = COUNT.exec(line);
		const key = count ? COUNT_KEY[count[2] as keyof typeof COUNT_KEY] : undefined;
		if (count && key) {
			o[key][count[3] as string] = Number(count[1]);
		}
		const hooks = HOOKS.exec(line);
		if (hooks) {
			o.hookEvents[hooks[1] as string] = (hooks[2] as string).split(",");
		}
		o.model ??= MODEL.exec(line)?.[1];
	}
	const body = isRecord(firstRequest) ? firstRequest : {};
	o.model = typeof body.model === "string" ? body.model : o.model;
	const systemMessages = Array.isArray(body.messages)
		? body.messages.filter((m) => isRecord(m) && m.role === "system").map((m) => blockText(m.content))
		: [];
	const systemText = [blockText(body.system), ...systemMessages].join("\n");
	o.outputStyle = STYLE.exec(systemText)?.[1]?.trim();
	o.tools = Array.isArray(body.tools) ? body.tools.filter(isRecord).map((t) => String(t.name)) : [];
	o.deferredTools = (DEFERRED.exec(systemText)?.[1] ?? "").split("\n").filter((l) => l !== "");
	return o;
};

const want = (diff: string[], what: string, expected: unknown, got: unknown): void => {
	if (!Bun.deepEquals(expected, got)) {
		diff.push(`${what}: want ${JSON.stringify(expected)} got ${JSON.stringify(got)}`);
	}
};

export const assertArm = (expect: ArmExpect, evidence: { debugLog: string; firstRequest: unknown }): ArmCheck => {
	const o = observe(evidence.debugLog, evidence.firstRequest);
	const diff: string[] = [];
	for (const p of expect.plugins ?? []) {
		if (!o.plugins.includes(p)) {
			diff.push(`plugin ${p}: not loaded; loaded ${JSON.stringify(o.plugins)}`);
		}
	}
	if (expect.outputStyle !== undefined) {
		want(diff, "output style", expect.outputStyle, o.outputStyle);
	}
	if (expect.model !== undefined) {
		want(diff, "model", expect.model, o.model);
	}
	for (const kind of ["agents", "skills", "commands"] as const) {
		for (const [plugin, n] of Object.entries(expect[kind] ?? {})) {
			want(diff, `${kind} of ${plugin}`, n, o[kind][plugin] ?? 0);
		}
	}
	for (const [module, events] of Object.entries(expect.hookEvents ?? {})) {
		const got = o.hookEvents[module] ?? [];
		const missing = events.filter((e) => !got.includes(e));
		if (missing.length > 0) {
			diff.push(`hook events of ${module}: missing ${JSON.stringify(missing)}`);
		}
	}
	if (expect.tools !== undefined) {
		want(diff, "tools", expect.tools, o.tools);
	}
	for (const t of expect.toolsInclude ?? []) {
		if (!o.tools.includes(t) && !o.deferredTools.includes(t)) {
			diff.push(`tool ${t}: absent from the first request`);
		}
	}
	for (const t of expect.toolsExclude ?? []) {
		if (o.tools.includes(t)) {
			diff.push(`tool ${t}: present in the first request`);
		} else if (o.deferredTools.includes(t)) {
			diff.push(`tool ${t}: present in the first request (deferred)`);
		}
	}
	return { ok: diff.length === 0, observed: o, diff };
};

const files = async (dir: string): Promise<string[]> =>
	(await readdir(dir, { recursive: true, withFileTypes: true }))
		.filter((e) => e.isFile())
		.map((e) => relative(dir, join(e.parentPath, e.name)))
		.sort();

// Hashes relative paths and contents, so a copy hashes the same as its source.
export const treeHash = async (dir: string): Promise<string> => {
	const h = createHash("sha256");
	for (const f of await files(dir)) {
		h.update(`${f}\0`);
		h.update(new Uint8Array(await Bun.file(join(dir, f)).arrayBuffer()));
		h.update("\0");
	}
	return h.digest("hex");
};

export const materializeArm = async (
	arm: Pick<Arm, "name" | "plugins">,
	run: Pick<Run, "dir">,
): Promise<{ pluginDirs: string[]; treeHashes: Record<string, string> }> => {
	const pluginDirs: string[] = [];
	const treeHashes: Record<string, string> = {};
	for (const [i, p] of arm.plugins.entries()) {
		const dest = join(run.dir, "arm", arm.name, String(i));
		await mkdir(dest, { recursive: true });
		await cp(p.dir, dest, { recursive: true });
		for (const patch of p.patches ?? []) {
			const file = join(dest, patch.file);
			const text = await Bun.file(file).text();
			if (!text.includes(patch.find)) {
				throw new Error(`patch of ${patch.file} in arm ${arm.name} matches nothing: ${JSON.stringify(patch.find)}`);
			}
			await Bun.write(file, text.replace(patch.find, patch.replace));
		}
		pluginDirs.push(dest);
		treeHashes[dest] = await treeHash(dest);
	}
	return { pluginDirs, treeHashes };
};
