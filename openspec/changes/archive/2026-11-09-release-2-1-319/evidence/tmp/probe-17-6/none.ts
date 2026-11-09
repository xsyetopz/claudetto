// The real betterleaks over made-up keys (bun test only: the lab cannot run a process).
import { expect, test } from "bun:test";
import { spawn } from "bun";
import { redact, SCANNER_VERSION, secretsIn } from "./secrets.ts";

type Run = Parameters<typeof secretsIn>[0];

const runWith =
	(path: string | undefined): Run =>
	async (argv, init) => {
		const child = spawn([...argv], {
			stdin: new TextEncoder().encode(String(init?.stdin ?? "")),
			env: { ...process.env, ...init?.env, PATH: path },
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
			child.exited,
		]);
		return {
			exitCode,
			stdout,
			stderr,
			isStdoutTruncated: false,
			isStderrTruncated: false,
		};
	};

const run = runWith(process.env.PATH);

// Joined at run time, so this file holds no key a push scanner would flag.
const KEYS = {
	CLAUDE_CODE_OAUTH_TOKEN: [
		"sk-ant-",
		"oat01-",
		"p1vRt_1fjORS-6ilI8ihN5KXSc7Tvo-hBKqFYY-kv5ZJr3J1TWDtkwtDDb_xHKas1VOqg6YYZ",
	],
	ANTHROPIC_API_KEY: [
		"sk-ant-",
		"api03-",
		"tGSU8po_799NksnRH9ucAUsdMlHUvTCQCyEZDz-TddJ8HyS5SUkCnD8zRA9a9SkpXz9w3QlY7Zkuvqd",
	],
	AWS_SECRET_ACCESS_KEY: ["2hpChYgCfrL1spNx", "nyVmihA+2O76UMFxFkM+R5Kj"],
	SLACK: ["xoxb-", "38014126906-044319829657-", "jsUNPjc01T5GOBUSZGi6HWGK"],
} as const;
const PASSWORD = ["zwd1iaeOV4", "qBkdfQ"].join("");
const BEARER = ["1y3GQsMpSscDlkrC", "aqx9vJupc94tnwlavyfErGPm"].join("");

const lines = [
	...Object.entries(KEYS).map(([name, parts]) => `${name}=${parts.join("")}`),
	`DATABASE_URL="postgres://admin:${PASSWORD}@db.example.com:5432/app"`,
	`Authorization: Bearer ${BEARER}`,
];
const secrets = [
	...Object.values(KEYS).map((parts) => parts.join("")),
	PASSWORD,
	BEARER,
];

test(`betterleaks ${SCANNER_VERSION} is the one on PATH`, async () => {
	const out = await run(["betterleaks", "version"]);
	expect(out.stdout).toContain(SCANNER_VERSION);
});

test("each made-up key, the URL password and the bearer token are found, and redacted", async () => {
	const text = `${lines.join("\n")}\nDATABASE_HOST=localhost\n`;

	const found = await secretsIn(run, text);
	const out = await redact(run, text);

	for (const secret of secrets) {
		expect(found).toContain(secret);
		expect(out).not.toContain(secret);
	}
	expect(out).toContain("DATABASE_HOST=localhost");
});

test("text with no secret gives none", async () => {
	const text =
		"DATABASE_HOST=localhost\nPORT=5432\nurl=https://example.com/a@b\nsee sk-ant-docs for help\n";

	expect(await secretsIn(run, text)).toEqual([]);
});

test("a value assigned to a secret-like name is redacted whatever its shape", async () => {
	const text =
		'DB_PASSWORD=hunter2\nexport API_KEY="abc"\nprivate_key=x1\nAUTH=zz9\n';

	const out = await redact(run, text);

	for (const value of ["hunter2", "abc", "x1", "zz9"]) {
		expect(out).not.toContain(value);
	}
	expect(out).toContain("DB_PASSWORD=[REDACTED]");
	expect(out).toContain('export API_KEY="[REDACTED]"');
});

test("a name that only contains a keyword inside a word is left alone", async () => {
	const text =
		"PATH=/usr/bin\nKEYBOARD_LAYOUT=us\nMONKEY=banana\nTURKEY=roast\nAUTHOR=ann\nTOKENIZER=bpe\n";

	expect(await secretsIn(run, text)).toEqual([]);
});

test("a missing scanner rejects with the install step", async () => {
	await expect(secretsIn(runWith("/nonexistent"), "x")).rejects.toThrow(
		"brew install betterleaks",
	);
});
