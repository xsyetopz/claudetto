import type { ApiContentBlock, EngineInterface, On } from "claude-code";

import { isRecord } from "../../settings/settings";
import { fault } from "../../shared/fault";
import { fieldOf } from "../../shared/field";
import { envSecrets, MIN_VALUE } from "./env";
import { answerText, maskAnswer } from "./record";

export const MASK = "[REDACTED]";

const SECRET_NAME =
	/secret|token|password|passwd|api_?key|private_?key|credential/iu;

/**
 * A secret-named assignment. Its leading name class backtracks at every word start
 * (0.26 ms per 10 KB of output in bun, 2026-11-19), so `redact` runs it only on text
 * that names a secret at all (0.01 ms per 10 KB).
 */
const ASSIGNMENT =
	/(\b[A-Za-z0-9_.-]*(?:secret|token|password|passwd|api_?key|private_?key|credential)[A-Za-z0-9_.-]*\s*[=:]\s*["']?)[^\s"'&;,]{6,}/giu;

/** Fallback token shapes, used when betterleaks is not installed or fails: common key prefixes, beside ASSIGNMENT. */
const SHAPES: readonly [RegExp, string][] = [
	[/sk-ant-[A-Za-z0-9_.-]+/gu, MASK],
	[
		/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{60,}|xox[a-z]-[A-Za-z0-9-]{10,}|[sr]k_(?:live|test)_[A-Za-z0-9]{16,}|AKIA[A-Z2-7]{16}|AIza[A-Za-z0-9_-]{35})/gu,
		MASK
	],
	[/(\bBearer\s+)[A-Za-z0-9._~+/=-]{8,}/gu, `$1${MASK}`]
];

/**
 * Masks each literal secret wherever it appears, longest first so a value that contains another is masked whole.
 *
 * @param text Tool output.
 * @param secrets Literal values: env-file values and scanner findings.
 * @param shapes Whether to apply the fallback SHAPES as well.
 */
export const redact = (
	text: string,
	secrets: readonly string[],
	shapes: boolean
): string => {
	let out = text;
	for (const secret of [...new Set(secrets)]
		.filter((s) => s.length >= MIN_VALUE)
		.toSorted((a, b) => b.length - a.length)) {
		out = out.split(secret).join(MASK);
	}
	if (!shapes) {
		return out;
	}
	if (SECRET_NAME.test(out)) {
		out = out.replaceAll(ASSIGNMENT, `$1${MASK}`);
	}
	for (const [shape, by] of SHAPES) {
		out = out.replaceAll(shape, by);
	}
	return out;
};

/** The text of one part of a tool_result's content: a text part's text, else nothing. */
const partText = (part: unknown): string => {
	const text = fieldOf(part, "text");
	return fieldOf(part, "type") === "text" && typeof text === "string"
		? text
		: "";
};

/** The text of one tool_result block: a string content, or its text parts joined. */
export const blockText = (block: ApiContentBlock): string => {
	if (block.type !== "tool_result") {
		return "";
	}
	const content = fieldOf(block, "content");
	if (typeof content === "string") {
		return content;
	}
	if (!Array.isArray(content)) {
		return "";
	}
	const parts: unknown[] = content;
	return parts.map((part) => partText(part)).join("\n");
};

/** Rewrites a text part with `mask`; any other part comes back as it was. */
const maskPart = (part: unknown, mask: (text: string) => string): unknown => {
	const text = fieldOf(part, "text");
	return isRecord(part) &&
		fieldOf(part, "type") === "text" &&
		typeof text === "string"
		? { ...part, text: mask(text) }
		: part;
};

/** Rewrites the text of one tool_result block with `mask`; every other block comes back as it was. */
export const mapBlock = (
	block: ApiContentBlock,
	mask: (text: string) => string
): ApiContentBlock => {
	if (block.type !== "tool_result") {
		return block;
	}
	const content = fieldOf(block, "content");
	if (typeof content === "string") {
		return { ...block, content: mask(content) };
	}
	if (!Array.isArray(content)) {
		return block;
	}
	const parts: unknown[] = content;
	return { ...block, content: parts.map((part) => maskPart(part, mask)) };
};

/** Parses a betterleaks JSON report into its secrets. */
export const findings = (report: string): string[] => {
	const parsed: unknown = JSON.parse(report === "" ? "[]" : report);
	return Array.isArray(parsed)
		? parsed
				.map((f: { Secret?: unknown }) => f.Secret)
				.filter((s): s is string => typeof s === "string")
		: [];
};

/** Scans text with betterleaks; undefined when it is not installed or fails, so the caller falls back to SHAPES. */
async function scan(
	$: EngineInterface,
	text: string
): Promise<string[] | undefined> {
	const config = `${$.plugin.root}/hooks/guards/redact/betterleaks.toml`;
	const argv = [
		"betterleaks",
		"stdin",
		"--no-banner",
		"-c",
		config,
		"-f",
		"json",
		"-r",
		"-",
		"--exit-code",
		"0",
		"-l",
		"error"
	];
	try {
		const run = await $.process.run(argv, { stdin: text, timeoutMs: 10_000 });
		return run.exitCode === 0 ? findings(run.stdout) : undefined;
	} catch (error: unknown) {
		fault($, "redact scan", error);
		return undefined;
	}
}

/** Builds the mask for one text: env-file values plus scanner findings, or SHAPES when the scanner is missing or fails. */
export async function maskFor(
	$: EngineInterface,
	text: string
): Promise<(t: string) => string> {
	const values = await envSecrets($).catch((error: unknown) => {
		fault($, "redact env read", error);
		return [];
	});
	const found = await scan($, text);
	return (t: string): string =>
		redact(t, [...values, ...(found ?? [])], found === undefined);
}

/** The SHAPES-only mask a failed hook falls back to, so a fault never passes raw output. */
export const shapesOnly = (t: string): string => redact(t, [], true);

/**
 * Masks secrets in every tool result before the model reads it and before the
 * transcript stores it (RISK-227, issue #54; RISK-506, issue #63).
 * Measured on 2.1.327 (2026-11-19): vanilla hands `cat .env` output to the model
 * verbatim. With values masked, the agent can load an env file into a command
 * (`set -a; . ./.env; set +a; ./check.sh`) without learning the secret, so a missing
 * variable that a file in reach supplies is no reason to stop.
 *
 * The `tool.call` hook masks the tool's record itself, so the session file's
 * `toolUseResult` holds the masked value too: `session.append` rewrites only a row's
 * content and stores that record as made (SessionAppendInput). The `session.append`
 * hook stays for the rows the `tool.call` hook did not mask, and skips the ones it did,
 * which saves a second scan.
 *
 * Two sources, because each misses what the other holds: betterleaks (466 default rules
 * plus betterleaks.toml) finds key shapes by pattern and entropy, about 0.1 s per result
 * (p50 92 ms, p95 145 ms over 100 real results); the literal values of env-style files
 * catch low-entropy secrets (`abc123xyz789`) no shape rule can. Without betterleaks the
 * built-in SHAPES stand in. A fault still masks with SHAPES rather than pass raw output.
 */
export function registerRedact(on: On): void {
	const masked = new Set<string>();
	// A pattern for every tool, because the engine allows a plugin one `tool.call` hook
	// without a matcher and the memory hold holds it (load check, 2.1.327).
	on("tool.call", { tool: /^/u }, async ($, e, next) => {
		const answer = await next(e);
		const text = answerText(answer);
		if (text === "") {
			return answer;
		}
		const out = maskAnswer(answer, await maskFor($, text));
		if (e.tool_use_id !== undefined) {
			masked.add(e.tool_use_id);
		}
		return out;
	}).catch(async ($, e, next) => {
		fault($, "redact", next.error);
		// Replay-safe: with `next.called` this resolves to the tool's settled answer without running it again.
		return maskAnswer(await next(e), shapesOnly);
	});
	on("session.append", { door: "tool-result" }, async ($, e, next) => {
		const blocks = e.message.content;
		const fresh = blocks.filter((block) => {
			const id = fieldOf(block, "tool_use_id");
			return (
				block.type === "tool_result" &&
				!masked.delete(typeof id === "string" ? id : "")
			);
		});
		const text = fresh.map((block) => blockText(block)).join("\n");
		if (text === "") {
			return next(e);
		}
		const mask = await maskFor($, text);
		const content = blocks.map((block) =>
			fresh.includes(block) ? mapBlock(block, mask) : block
		);
		return next({ ...e, message: { ...e.message, content } });
	}).catch(($, e, next) => {
		fault($, "redact", next.error);
		const content = e.message.content.map((block) =>
			mapBlock(block, shapesOnly)
		);
		return next({ ...e, message: { ...e.message, content } });
	});
}
