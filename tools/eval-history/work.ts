/** A virtual working tree plus the transcript of the tool calls that touched it. */
import { initialFiles, MODULES } from "./repo";
import type { Session } from "./session";

/** Builds a seeded generator (mulberry32) so that every run emits the same history. */
export const rngOf = (seed: number): (() => number) => {
	let a = seed;
	return () => {
		// `imul(1, x)` wraps to int32 exactly as the reference algorithm's `| 0` does.
		a = Math.imul(1, a + 1_831_565_813);
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
};

/** Upper-cases the first letter. */
export const cap = (s: string): string =>
	s.charAt(0).toUpperCase() + s.slice(1);

/** The tiny-cart tree as the session sees it, with the tool calls that read and change it. */
export class Work {
	readonly files = initialFiles();
	readonly session: Session;
	readonly dirty = new Set<string>();
	readonly testCounts = new Map<string, number>();
	readonly rand: () => number;

	constructor(session: Session, rand: () => number) {
		this.session = session;
		this.rand = rand;
		for (const mod of MODULES) {
			this.testCounts.set(mod.name, mod.nouns.length * 2);
		}
	}

	pick<T>(items: readonly T[]): T {
		const item = items[Math.floor(this.rand() * items.length)];
		if (item === undefined) {
			throw new Error("pick from an empty list");
		}
		return item;
	}

	file(path: string): string {
		const text = this.files.get(path);
		if (text === undefined) {
			throw new Error(`no file ${path}`);
		}
		return text;
	}

	read(path: string, offset?: number, limit?: number): void {
		const input: Record<string, unknown> = { file_path: path };
		if (offset !== undefined) {
			input["offset"] = offset;
		}
		if (limit !== undefined) {
			input["limit"] = limit;
		}
		const call = this.session.toolCall("Read", input);
		const lines = this.file(path).split("\n");
		if (lines.at(-1) === "") {
			lines.pop();
		}
		const from = (offset ?? 1) - 1;
		const slice = lines.slice(
			from,
			limit === undefined ? undefined : from + limit
		);
		this.session.toolResult(
			call,
			slice.map((l, i) => `${String(from + i + 1).padStart(6)}→${l}`).join("\n")
		);
	}

	grep(pattern: string, path: string): void {
		const call = this.session.toolCall("Grep", {
			pattern,
			path,
			output_mode: "content",
			"-n": true
		});
		const re = new RegExp(pattern, "u");
		const hits: string[] = [];
		for (const [name, text] of this.files) {
			if (!name.startsWith(path === "." ? "" : path)) {
				continue;
			}
			for (const [i, line] of text.split("\n").entries()) {
				if (re.test(line)) {
					hits.push(`${name}:${i + 1}:${line}`);
				}
			}
		}
		this.session.toolResult(
			call,
			hits.length === 0 ? "No matches found" : hits.join("\n")
		);
	}

	edit(path: string, from: string, to: string): void {
		const call = this.session.toolCall("Edit", {
			file_path: path,
			old_string: from,
			new_string: to
		});
		const before = this.file(path);
		if (before.split(from).length !== 2) {
			throw new Error(
				`edit anchor not unique in ${path}: ${from.slice(0, 40)}`
			);
		}
		const after = before.replace(from, () => to);
		this.files.set(path, after);
		this.dirty.add(path);
		const at = after.split("\n");
		const line = after.slice(0, after.indexOf(to)).split("\n").length - 1;
		const snippet = at
			.slice(Math.max(0, line - 4), line + to.split("\n").length + 4)
			.map(
				(l, i) => `${String(Math.max(0, line - 4) + i + 1).padStart(6)}→${l}`
			)
			.join("\n");
		this.session.toolResult(
			call,
			`The file ${path} has been updated. Here's the result of running \`cat -n\` on a snippet of the edited file:\n${snippet}`
		);
	}

	bash(command: string, description: string, output: string): void {
		const call = this.session.toolCall("Bash", { command, description });
		this.session.toolResult(call, output);
	}

	testRun(name: string): void {
		const n = this.testCounts.get(name) ?? 0;
		const mod = MODULES.find((m) => m.name === name);
		const rows = (mod?.nouns ?? [])
			.flatMap((noun) => [
				`(pass) ${name} > ${noun} is zero for an empty line [0.0${1 + Math.floor(this.rand() * 8)}ms]`,
				`(pass) ${name} > ${noun} grows with the quantity [0.0${1 + Math.floor(this.rand() * 8)}ms]`
			])
			.join("\n");
		const extra = n - (mod?.nouns.length ?? 0) * 2;
		const more = Array.from(
			{ length: Math.max(0, extra) },
			(_, i) => `(pass) ${name} > added case ${i + 1} [0.03ms]`
		).join("\n");
		this.bash(
			`bun test test/${name}.test.js`,
			`Run the ${name} tests`,
			`bun test v1.4.5 (a1b2c3d4)\n\ntest/${name}.test.js:\n${rows}${more === "" ? "" : `\n${more}`}\n\n ${n} pass\n 0 fail\n ${n} expect() calls\nRan ${n} tests across 1 file. [${12 + Math.floor(this.rand() * 30)}.00ms]`
		);
	}

	bumpConstant(mod: string, noun: string): string {
		const path = `src/${mod}.js`;
		const re = new RegExp(
			`export const DEFAULT_${noun.toUpperCase()}_RATE = ([0-9.]+);`,
			"u"
		);
		const found = re.exec(this.file(path));
		if (found === null) {
			throw new Error(`no rate for ${noun} in ${path}`);
		}
		const next = (Number(found[1]) + 0.01).toFixed(2);
		this.edit(
			path,
			found[0],
			`export const DEFAULT_${noun.toUpperCase()}_RATE = ${next};`
		);
		return next;
	}
}
