import type { EngineInterface, On } from "claude-code";
import { fault } from "../../shared/fault";

export const MASK = "[REDACTED]";

/** Values shorter than this stay visible: `1`, `true` or `dev` would mask ordinary output and hide no secret. */
const MIN_VALUE = 6;

/**
 * Env-style secret files by name, not by a fixed list: `.env`, `.env.<stage>`, `<name>.env`, `.envrc`,
 * `secrets.<ext>`. Templates (`.example`, `.sample`, `.template`, `.dist`) hold placeholders and stay readable.
 */
export const isEnvFile = (name: string): boolean =>
	/^(?:\.env(?:\..+)?|.+\.env|\.envrc|\.?secrets?(?:\..+)?)$/iu.test(name) && !/\.(?:example|sample|template|dist)$/iu.test(name);

/** Directories searched for env-style files, besides the project root. */
const ENV_DIRS: readonly string[] = ["", "config", ".config"];

/**
 * Reads the values of a dotenv file: `KEY=value`, `export KEY=value`, quoted or bare,
 * with a trailing ` #` comment dropped from a bare value.
 *
 * @param text The file's text.
 * @returns Each value at least MIN_VALUE characters long.
 */
export const envValues = (text: string): string[] => {
	const values = new Set<string>();
	for (const line of text.split(/\r?\n/u)) {
		const match = /^\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_.-]*\s*=\s*(.*)$/u.exec(line);
		if (match?.[1] === undefined) continue;
		const raw = match[1].trim();
		const quoted = /^(["'`])(.*)\1$/u.exec(raw);
		const value = quoted?.[2] ?? raw.replace(/\s+#.*$/u, "");
		if (value.length >= MIN_VALUE) values.add(value);
	}
	return [...values];
};

const SECRET_NAME = /secret|token|password|passwd|api_?key|private_?key|credential/iu;

/**
 * A secret-named assignment. Its leading name class backtracks at every word start
 * (0.26 ms per 10 KB of output in bun, 2026-11-19), so `redact` runs it only on text
 * that names a secret at all (0.01 ms per 10 KB).
 */
const ASSIGNMENT = /(\b[A-Za-z0-9_.-]*(?:secret|token|password|passwd|api_?key|private_?key|credential)[A-Za-z0-9_.-]*\s*[=:]\s*["']?)[^\s"'&;,]{6,}/giu;

/** Fallback token shapes, used when betterleaks is not installed or fails: common key prefixes, beside ASSIGNMENT. */
const SHAPES: readonly [RegExp, string][] = [
	[/sk-ant-[A-Za-z0-9_.-]+/gu, MASK],
	[/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{60,}|xox[a-z]-[A-Za-z0-9-]{10,}|[sr]k_(?:live|test)_[A-Za-z0-9]{16,}|AKIA[A-Z2-7]{16}|AIza[A-Za-z0-9_-]{35})/gu, MASK],
	[/(\bBearer\s+)[A-Za-z0-9._~+/=-]{8,}/gu, `$1${MASK}`],
];

/**
 * Masks each literal secret wherever it appears, longest first so a value that contains another is masked whole.
 *
 * @param text Tool output.
 * @param secrets Literal values: env-file values and scanner findings.
 * @param shapes Whether to apply the fallback SHAPES as well.
 */
export const redact = (text: string, secrets: readonly string[], shapes: boolean): string => {
	let out = text;
	for (const secret of [...new Set(secrets)].filter((s) => s.length >= MIN_VALUE).sort((a, b) => b.length - a.length)) out = out.split(secret).join(MASK);
	if (!shapes) return out;
	if (SECRET_NAME.test(out)) out = out.replace(ASSIGNMENT, `$1${MASK}`);
	for (const [shape, by] of SHAPES) out = out.replace(shape, by);
	return out;
};

type Block = { type: string; text?: string; content?: unknown };

/** The text of one tool_result block: a string content, or its text parts joined. */
export const blockText = (block: Block): string => {
	if (block.type !== "tool_result") return "";
	if (typeof block.content === "string") return block.content;
	if (!Array.isArray(block.content)) return "";
	return block.content.map((part: Block) => (part.type === "text" && typeof part.text === "string" ? part.text : "")).join("\n");
};

/** Rewrites the text of one tool_result block with `mask`; every other block comes back as it was. */
export const mapBlock = (block: Block, mask: (text: string) => string): Block => {
	if (block.type !== "tool_result") return block;
	if (typeof block.content === "string") return { ...block, content: mask(block.content) };
	if (!Array.isArray(block.content)) return block;
	return { ...block, content: block.content.map((part: Block) => (part.type === "text" && typeof part.text === "string" ? { ...part, text: mask(part.text) } : part)) };
};

/** Parses a betterleaks JSON report into its secrets. */
export const findings = (report: string): string[] => {
	const parsed: unknown = JSON.parse(report === "" ? "[]" : report);
	return Array.isArray(parsed) ? parsed.map((f: { Secret?: unknown }) => f.Secret).filter((s): s is string => typeof s === "string") : [];
};

const envSecrets = async ($: EngineInterface): Promise<string[]> => {
	const root = await $.session.root();
	const values: string[] = [];
	for (const dir of ENV_DIRS) {
		const path = dir === "" ? root : `${root}/${dir}`;
		if (!(await $.fs.exists(path))) continue;
		for (const entry of await $.fs.list(path)) {
			if (entry.kind === "file" && isEnvFile(entry.name)) values.push(...envValues(await $.fs.read(`${path}/${entry.name}`)));
		}
	}
	return values;
};

/** Scans text with betterleaks; undefined when it is not installed or fails, so the caller falls back to SHAPES. */
const scan = async ($: EngineInterface, text: string): Promise<string[] | undefined> => {
	const config = `${$.plugin.root}/hooks/guards/redact/betterleaks.toml`;
	const argv = ["betterleaks", "stdin", "--no-banner", "-c", config, "-f", "json", "-r", "-", "--exit-code", "0", "-l", "error"];
	const run = await $.process.run(argv, { stdin: text, timeoutMs: 10_000 }).catch((err: unknown) => (fault($, "redact scan", err), undefined));
	return run?.exitCode === 0 ? findings(run.stdout) : undefined;
};

/**
 * Masks secrets in every tool result before the model reads it (RISK-227, issue #54).
 * Measured on 2.1.327 (2026-11-19): vanilla hands `cat .env` output to the model
 * verbatim. With values masked, the agent can load an env file into a command
 * (`set -a; . ./.env; set +a; ./check.sh`) without learning the secret, so a missing
 * variable that a file in reach supplies is no reason to stop.
 *
 * Engine limit (2.1.327, issue #59): the row's structured record (`toolUseResult.stdout`)
 * is stored as made and is outside a hook's reach (SessionAppendInput in the plugin
 * types), so the transcript file keeps the raw value while the model reads the masked
 * `content`. Remove this note once `session.append` lets a hook rewrite that record.
 *
 * Two sources, because each misses what the other holds: betterleaks (466 default rules
 * plus betterleaks.toml) finds key shapes by pattern and entropy, about 0.1 s per result
 * (p50 92 ms, p95 145 ms over 100 real results); the literal values of env-style files
 * catch low-entropy secrets (`abc123xyz789`) no shape rule can. Without betterleaks the
 * built-in SHAPES stand in. A fault still masks with SHAPES rather than pass raw output.
 */
export function registerRedact(on: On): void {
	on("session.append", { door: "tool-result" }, async ($, e, next) => {
		const text = e.message.content.map((block) => blockText(block as Block)).join("\n");
		if (text === "") return next(e);
		const values = await envSecrets($).catch((error: unknown) => (fault($, "redact env read", error), []));
		const found = await scan($, text);
		const mask = (t: string): string => redact(t, [...values, ...(found ?? [])], found === undefined);
		const content = e.message.content.map((block) => mapBlock(block as Block, mask)) as typeof e.message.content;
		return next({ ...e, message: { ...e.message, content } });
	}).catch(($, e, next) => {
		fault($, "redact", next.error);
		const content = e.message.content.map((block) => mapBlock(block as Block, (t) => redact(t, [], true))) as typeof e.message.content;
		return next({ ...e, message: { ...e.message, content } });
	});
}
