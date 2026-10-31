import { describe, expect, test } from "bun:test";
import { bash, facts } from "../../__tests__/facts-stub.ts";

const withEnv = () => ({ ...facts(), hasEnvFile: async () => [".env"] });

describe("a word with an unknown part, in a project with an env file", () => {
	for (const command of [
		'bun call.ts code "{\\"query\\":\\"$f\\"}"',
		'bun call.ts code "{\\"action\\":\\"search\\",\\"query\\":\\"$f\\",\\"limit\\":3}"',
		'tool "--name=$f:x"',
		'grep -n "$f.\\{0,9\\}" a.txt',
	]) {
		test(`\`${command}\` is allowed: a literal after the unknown part is no env-file character`, async () => {
			const v = await bash(command, withEnv());

			expect(v.decision).toBe("allow");
		});
	}

	for (const command of [
		'cat "$F"',
		"cat $F",
		'python3 -I "$py" --help',
		'cat "$d/$f"',
		'cat "{x}/$f"',
		'cat "$f"*',
		'cat "$f"[x]',
		"cat $f.env",
	]) {
		test(`\`${command}\` asks: the file name can be an env file`, async () => {
			const v = await bash(command, withEnv());

			expect(v.decision).toBe("ask");
		});
	}

	test("with no env file in the project, an unknown file name is allowed", async () => {
		const v = await bash('cat "$F"', facts());

		expect(v.decision).toBe("allow");
	});
});

describe("a loop variable over a literal list, in a project with an env file", () => {
	for (const [command, decision] of [
		['for f in a.txt b.txt; do sed -n p "$f"; done', "allow"],
		['for f in a.txt .env; do cat "$f"; done', "deny"],
		['for f in *; do cat "$f"; done', "ask"],
		['for f in "$@"; do cat "$f"; done', "ask"],
		['py=$(mktemp); python3 -I "$py"', "ask"],
	] as const) {
		test(`\`${command}\` gives ${decision}`, async () => {
			const v = await bash(command, withEnv());

			expect(v.decision).toBe(decision);
		});
	}
});

describe("a secret file name inside a match script, with file names from `xargs`", () => {
	for (const command of [
		"rg -l x | xargs sed -i '' 's/.env/x/'",
		"rg -l x | xargs grep -n '.env'",
		"rg -l x | xargs sed -e 's|\\.env|x|'",
	]) {
		test(`\`${command}\` is allowed: the script is text to match, not a file to read`, async () => {
			const v = await bash(command, facts());

			expect(v.decision).toBe("allow");
		});
	}

	for (const command of [
		"rg -l x | xargs grep -n '.env' .env",
		"rg -l x | xargs cat .env",
	]) {
		test(`\`${command}\` is denied: a secret file is read next to the input names`, async () => {
			const v = await bash(command, facts());

			expect(v.decision).toBe("deny");
		});
	}
});
