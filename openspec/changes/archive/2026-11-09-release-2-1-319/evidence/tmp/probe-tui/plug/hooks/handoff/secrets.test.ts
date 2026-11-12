import { expect, test } from "claude-code/testing";

import { redact } from "./secrets.ts";

const R = "[REDACTED]";
const KEY_BODY = "b3BlbnNzaC1rZXktdjE\nAAAABG5vbmU";

// Each token is followed by " x", so a pattern that stops early leaves part of it.
const CASES: [string, string, string][] = [
	[
		"an OpenSSH key block",
		`a\n-----BEGIN OPENSSH PRIVATE KEY-----\n${KEY_BODY}\n-----END OPENSSH PRIVATE KEY-----\nz`,
		`a\n${R}\nz`,
	],
	[
		"a PGP key block",
		`a\n-----BEGIN PGP PRIVATE KEY BLOCK-----\n${KEY_BODY}\n-----END PGP PRIVATE KEY BLOCK-----\nz`,
		`a\n${R}\nz`,
	],
	[
		"a key block cut off before its end line",
		`a\n-----BEGIN RSA PRIVATE KEY-----\n${KEY_BODY}`,
		`a\n${R}`,
	],
	[
		"an Anthropic key too short for the sk- pattern",
		"k sk-ant-abcdefghij x",
		`k ${R} x`,
	],
	["an sk- key", "k sk-abcdefghijklmnopqrst x", `k ${R} x`],
	["a GitHub token", `k ghp_${"a".repeat(30)} x`, `k ${R} x`],
	[
		"a GitHub fine-grained token",
		`k github_pat_${"a".repeat(50)} x`,
		`k ${R} x`,
	],
	["a GitLab token", "k glpat-abcdefghijklmnopqrst x", `k ${R} x`],
	["an AWS key id", "k AKIAIOSFODNN7EXAMPLE x", `k ${R} x`],
	["a Google key", `k AIza${"a".repeat(35)} x`, `k ${R} x`],
	["a Slack token", "k xoxb-1234567890ab x", `k ${R} x`],
	["a JWT", "k eyJhbGciOiJI.eyJzdWIiOiIx.c2lnbmF0dXJl x", `k ${R} x`],
	[
		"a bearer token after two spaces",
		"Authorization: Bearer  abcdefghijklmnop1234 x",
		`Authorization: ${R} x`,
	],
	["a password after a prefix", "db_password=hunter2;", `db_password=${R};`],
	[
		"a token with a suffix, spaced",
		"API_TOKEN_VALUE = hunter2",
		`API_TOKEN_VALUE = ${R}`,
	],
	["apikey", "apikey: hunter2", `apikey: ${R}`],
	["api_key", "api_key=hunter2", `api_key=${R}`],
	["privatekey", "privatekey=hunter2", `privatekey=${R}`],
	["private-key", "private-key=hunter2", `private-key=${R}`],
	["a JSON field", '{"password": "hunter 2"}', `{"password": ${R}}`],
	["a single-quoted value", "secret='hunter 2'", `secret=${R}`],
	[
		"a password in a URL",
		"https://user:pa55@host/x",
		`https://user:${R}@host/x`,
	],
];

for (const [name, text, out] of CASES) {
	test(`redact: ${name}`, () => {
		expect(redact(text)).toBe(out);
	});
}

test("redact keeps text that holds no secret", () => {
	const text = "https://host/x?a=1 sk-short password";
	expect(redact(text)).toBe(text);
});
