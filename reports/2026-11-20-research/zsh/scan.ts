// Counts, across Claude Code transcripts, the Bash commands whose meaning changes under
// `setopt ksh_arrays` or `setopt sh_word_split` (issue #61). Read-only.
// Usage: bun scan.ts <projects-dir> [samples-per-class]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? "";
const keep = Number(process.argv[3] ?? "5");

const files = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path) : name.endsWith(".jsonl") ? [path] : [];
	});

/** Unquoted `$name` / `${name}` expansions, with their offset; quotes and backslashes tracked, `$(`/`$((` skipped. */
const unquoted = (cmd: string): { name: string; at: number }[] => {
	const out: { name: string; at: number }[] = [];
	let q = "";
	for (let i = 0; i < cmd.length; i++) {
		const c = cmd.charAt(i);
		if (c === "\\" && q !== "'") {
			i++;
			continue;
		}
		if (q === "") {
			if (c === "'" || c === '"') q = c;
			else if (c === "$") {
				const m = /^\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))/u.exec(cmd.slice(i));
				if (m !== null) out.push({ name: m[1] ?? m[2] ?? "", at: i });
			}
		} else if (c === q) q = "";
	}
	return out;
};

/** Values assigned to each name in the command, as written (quotes kept). */
const assigned = (cmd: string): Map<string, string[]> => {
	const map = new Map<string, string[]>();
	const re = /(?:^|[\s;&|(])(?:export\s+|local\s+)?([A-Za-z_]\w*)=("(?:[^"\\]|\\.)*"|'[^']*'|\$\((?:[^()]|\([^()]*\))*\)|`[^`]*`|[^\s;&|()]*)/gu;
	for (const m of cmd.matchAll(re)) {
		const name = m[1] ?? "";
		map.set(name, [...(map.get(name) ?? []), m[2] ?? ""]);
	}
	return map;
};

/** Whether a value can hold a space after expansion: a quoted literal with one, or a command substitution. */
const spaced = (v: string): boolean => /^["'].*\s.*["']$/su.test(v) || v.startsWith("$(") || v.startsWith("`");

/** Where the expansion sits: first word of a simple command, a `for x in` list, or an argument. */
const position = (cmd: string, at: number): "command" | "for" | "arg" => {
	const before = cmd.slice(0, at);
	if (/(?:^|[;&|(\n]|\bdo|\bthen|\belse|\btime|\bexec|\bsudo|\benv)\s*$/u.test(before)) return "command";
	if (/\bfor\s+\w+\s+in\s+(?:[^;\n]*\s)?$/u.test(before)) return "for";
	return "arg";
};

const counts: Record<string, number> = {};
const samples: Record<string, string[]> = {};
const hit = (cls: string, where: string, cmd: string): void => {
	counts[cls] = (counts[cls] ?? 0) + 1;
	const list = (samples[cls] ??= []);
	if (list.length < keep) list.push(`${where}  ${cmd.replace(/\s+/gu, " ").slice(0, 160)}`);
};

/** The command with heredoc bodies removed, so code inside a heredoc is not read as shell. */
const stripHeredocs = (cmd: string): string => {
	const lines = cmd.split("\n");
	const out: string[] = [];
	let end: string | undefined;
	for (const line of lines) {
		if (end !== undefined) {
			if (line.trim() === end) end = undefined;
			continue;
		}
		out.push(line);
		const m = /<<-?\s*['"]?(\w+)['"]?/u.exec(line);
		if (m !== null) end = m[1];
	}
	return out.join("\n");
};

/** Whether the result shows zsh passing the spaced value as one word: an error line that holds it. */
const faulted = (result: string, value: string): boolean => {
	const probe = value.slice(0, 40);
	return result.split("\n").some((l) => l.includes(probe) && /no such file|not found|cannot|No such|does not exist|unknown option|invalid/iu.test(l));
};

type Use = { cmd: string; where: string };
const uses = new Map<string, Use>();
const results = new Map<string, string>();
for (const file of files(root)) {
	readFileSync(file, "utf8").split("\n").forEach((line, n) => {
		const bash = line.includes('"name":"Bash"');
		if (!bash && !line.includes('"tool_result"')) return;
		let row: { message?: { content?: unknown } };
		try {
			row = JSON.parse(line);
		} catch {
			return;
		}
		const content = row.message?.content;
		if (!Array.isArray(content)) return;
		for (const block of content as { type?: string; name?: string; id?: string; tool_use_id?: string; input?: { command?: string }; content?: unknown }[]) {
			if (block.type === "tool_use" && block.name === "Bash" && typeof block.input?.command === "string") uses.set(block.id ?? `${file}:${n}`, { cmd: block.input.command, where: `${file.replace(root, "P")}:${n + 1}` });
			if (block.type === "tool_result" && block.tool_use_id !== undefined) {
				const c = block.content;
				results.set(block.tool_use_id, typeof c === "string" ? c : Array.isArray(c) ? c.map((x: { text?: string }) => x.text ?? "").join("\n") : "");
			}
		}
	});
}

const commands = uses.size;
for (const [id, { cmd: full, where }] of uses) {
	const cmd = stripHeredocs(full);
	const result = results.get(id) ?? "";
	// ksh_arrays: zsh 1-based subscripts the option re-bases to 0.
	if (/\$\{?pipestatus\[/u.test(cmd)) hit("ksh_arrays: pipestatus[n]", where, cmd);
	if (/\$\{[A-Za-z_]\w*\[-?\d+\]\}/u.test(cmd) && !/\$\{?pipestatus\[/u.test(cmd)) hit("ksh_arrays: ${arr[n]}", where, cmd);
	// sh_word_split: an unquoted expansion of a name assigned in the same command a value that can hold a space.
	const vars = assigned(cmd);
	const seen = new Set<string>();
	for (const { name, at } of unquoted(cmd)) {
		const values = vars.get(name);
		if (values === undefined || !values.some(spaced)) continue;
		const literal = values.find((v) => /^["']/u.test(v) && spaced(v));
		// A quoted literal with a space splits for certain; a substitution splits only when its output holds one.
		const kind = literal === undefined ? "substitution" : faulted(result, literal.slice(1, -1)) ? "literal, zsh fault seen" : "literal, no fault seen";
		const cls = `sh_word_split: ${position(cmd, at)}, ${kind}`;
		if (seen.has(cls)) continue;
		seen.add(cls);
		const shown = literal ?? values.find(spaced) ?? "";
		hit(cls, where, `${name}=${shown.slice(0, 70)} ... ${cmd.slice(Math.max(0, at - 50), at + 30)}`);
	}
}

console.log(`Bash commands: ${commands}`);
for (const cls of Object.keys(counts).sort()) {
	console.log(`\n${cls}: ${counts[cls]}`);
	for (const s of samples[cls] ?? []) console.log(`  ${s}`);
}
