import type { EngineInterface } from "claude-code";

import { secretScanFailed } from "./texts.ts";

export const SCANNER = "betterleaks";
export const SCANNER_INSTALL = ["brew", "install", SCANNER] as const;

const REDACTED = "[REDACTED]";

// The defaults miss Anthropic OAuth and non-api03 keys, a URL's password, an Authorization header, and an AWS secret key without its key ID beside it (probe in design.md, "Secret matcher").
const CONFIG = `
[extend]
useDefault = true

[[rules]]
id = "anthropic-any-key"
description = "Anthropic API key or OAuth token of any kind"
regex = '''\\b(sk-ant-[a-z0-9]+-[A-Za-z0-9_\\-]{20,})'''
keywords = ["sk-ant-"]

[[rules]]
id = "aws-secret-access-key-assignment"
description = "AWS secret access key assigned to its usual name"
regex = '''(?i)aws_secret_access_key["']?\\s*[=:]\\s*["']?([A-Za-z0-9/+]{40})\\b'''
keywords = ["aws_secret_access_key"]

[[rules]]
id = "url-userinfo-password"
description = "Password in a URL's userinfo"
regex = '''\\b[a-zA-Z][a-zA-Z0-9+.\\-]*://[^\\s:/@]+:([^\\s@/]+)@'''
keywords = ["://"]

[[rules]]
id = "authorization-header"
description = "Bearer or Basic credential in an Authorization header"
regex = '''(?i)\\bauthorization["']?\\s*[:=]\\s*["']?(?:bearer|basic)\\s+([A-Za-z0-9._~+/=\\-]{8,})'''
keywords = ["authorization"]

[[rules]]
id = "secret-named-assignment"
description = "Value of a NAME=value line whose NAME has a secret-like segment"
regex = '''(?im)^\\s*(?:export\\s+)?(?:[a-z0-9]+_)*(?:secret|token|password|passwd|key|credential|auth|private)(?:_[a-z0-9]+)*=["']?([^\\s"']+)'''
keywords = ["secret", "token", "password", "passwd", "key", "credential", "auth", "private"]
`;

type Run = EngineInterface["process"]["run"];

/** Rejects when the scanner cannot start or fails, so a caller never passes text it could not check. */
export const secretsIn = async (
	run: Run,
	text: string,
): Promise<readonly string[]> => {
	if (text === "") {
		return [];
	}
	// `--exit-code 0` leaves exit 1 to errors alone; the empty variables keep a user's own config from replacing ours.
	const argv = [
		SCANNER,
		"stdin",
		"-f",
		"json",
		"-r",
		"-",
		"--no-banner",
		"-l",
		"error",
		"--exit-code",
		"0",
	];
	const env = {
		BETTERLEAKS_CONFIG: "",
		GITLEAKS_CONFIG: "",
		BETTERLEAKS_CONFIG_TOML: CONFIG,
	};
	const result = await run(argv, { stdin: text, env }).catch(
		(error: unknown) => {
			throw new Error(secretScanFailed(String(error)));
		},
	);
	if (result.exitCode !== 0) {
		throw new Error(secretScanFailed(result.stderr.trim()));
	}
	const found: unknown = JSON.parse(result.stdout);
	if (!Array.isArray(found)) {
		throw new Error(secretScanFailed(`unexpected output: ${result.stdout}`));
	}
	const secrets = found.map((f: { Secret?: unknown }) =>
		typeof f.Secret === "string" ? f.Secret : "",
	);
	// Longest first, so a secret inside a longer one does not split it.
	return [...new Set(secrets)]
		.filter((secret) => secret !== "")
		.sort((a, b) => b.length - a.length);
};

export const redactWith = (
	text: string,
	secrets: readonly string[],
): string => {
	let out = text;
	for (const secret of secrets) {
		out = out.replaceAll(secret, REDACTED);
	}
	return out;
};

export const redact = async (run: Run, text: string): Promise<string> =>
	redactWith(text, await secretsIn(run, text));

/** Every string inside `value`, with each secret replaced. */
export const redactAll = (
	value: unknown,
	secrets: readonly string[],
): unknown => {
	if (typeof value === "string") {
		return redactWith(value, secrets);
	}
	if (Array.isArray(value)) {
		return value.map((item) => redactAll(item, secrets));
	}
	return typeof value === "object" && value !== null
		? Object.fromEntries(
				Object.entries(value).map(([k, v]) => [k, redactAll(v, secrets)]),
			)
		: value;
};
