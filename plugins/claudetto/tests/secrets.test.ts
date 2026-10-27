// Lab tests of the `gate.secrets` hook (task 19.16 of change `redesign-0-4-0`): a value of an env file never reaches the model.
// The stub of `tool.call` stands for core: it answers with `reply`. The stubbed files stand for the project at `/p`, and the fakes are in `stubs/secrets.ts`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { bash, ENV, PASS, stub, TOKEN, warned } from "./stubs/secrets.ts";

test("Printed Value: a `Bash` result that prints a value of a key shows the key and not the value", async ($: Engine, on: On) => {
	stub(
		on,
		{ [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n` },
		{
			stdout: `token=${TOKEN}\n`,
			stderr: "",
		},
	);
	const answer = await bash($);
	const shown = JSON.stringify(answer.result);
	expect(shown).toContain("[value of API_TOKEN]");
	expect(shown).not.toContain(TOKEN);
});

test("No Value: a result with no value stays as it is", async ($: Engine, on: On) => {
	const reply = { stdout: "all good\n", stderr: "" };
	stub(on, { [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n` }, reply);
	expect((await bash($)).result).toStrictEqual(reply);
});

test("Other Name: a value of `prod.env` in a subfolder is replaced", async ($: Engine, on: On) => {
	stub(on, { "/p/conf/prod.env": `DB_PASS=${PASS}\n` }, `login ${PASS}`);
	expect((await bash($)).result).toBe("login [value of DB_PASS]");
});

test("Renamed Copy: a `Read` of a copy under another name shows no value", async ($: Engine, on: On) => {
	const content = `DB_PASS=${PASS}\n`;
	stub(
		on,
		{ [`/p/${ENV}`]: content, "/p/copy.txt": content },
		{
			type: "text",
			file: { filePath: "/p/copy.txt", content },
		},
	);
	const answer = await $.tool.call({ tool: "Read", file_path: "/p/copy.txt" });
	expect(JSON.stringify(answer.result)).not.toContain(PASS);
	expect(JSON.stringify(answer.result)).toContain("DB_PASS=[value of DB_PASS]");
});

test("Base64 Form: the base64 of a value is replaced, and so is a content array", async ($: Engine, on: On) => {
	stub(on, { [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n` }, [
		{ type: "text", text: `Zm9v ${btoa(TOKEN)} ${TOKEN}` },
	]);
	const shown = JSON.stringify((await bash($)).result);
	expect(shown).not.toContain(btoa(TOKEN));
	expect(shown).not.toContain(TOKEN);
	expect(shown).toContain("Zm9v [value of API_TOKEN] [value of API_TOKEN]");
});

test("Parsing: `export`, quotes, and a comment give the value, and a short value or a commented line is kept", async ($: Engine, on: On) => {
	const text = `export DB_PASS="${PASS}" # the pass\nDEBUG=true\nPORT=3000\n# OLD=oldoldoldold\nNAME='dev'\n`;
	stub(
		on,
		{ [`/p/${ENV}`]: text },
		`${PASS} true 3000 oldoldoldold dev the pass`,
	);
	expect((await bash($)).result).toBe(
		"[value of DB_PASS] true 3000 oldoldoldold dev the pass",
	);
});

test("Unchanged File: a file is read again only when its modification time changes", async ($: Engine, on: On) => {
	let mtime = 1;
	const reads = stub(on, { [`/w/${ENV}`]: `API_TOKEN=${TOKEN}\n` }, "x", {
		mtime: () => mtime,
		root: "/w",
	});
	await bash($);
	await bash($);
	const before = reads.length;
	mtime = 2;
	await bash($);
	expect([before, reads.length]).toStrictEqual([1, 2]);
});

for (const [name, target] of [
	["Moved Away", "notes.txt"],
	["Renamed Example", `${ENV}.example`],
] as const) {
	test(`${name}: a value stays replaced after \`mv ${ENV} ${target}\` removes the env file`, async ($: Engine, on: On) => {
		const files: Record<string, string> = {
			[`/p/${ENV}`]: `MOVED_KEY=${TOKEN}\n`,
		};
		stub(on, files, `moved ${TOKEN}`);
		await $.tool.call({ tool: "Bash", command: `mv ${ENV} ${target}` });
		delete files[`/p/${ENV}`];
		files[`/p/${target}`] = `MOVED_KEY=${TOKEN}\n`;
		const answer = await $.tool.call({
			tool: "Bash",
			command: `sort ${target}`,
		});
		expect(answer.result).toBe("moved [value of MOVED_KEY]");
	});
}

for (const [name, line, shown, key] of [
	["Short Pass", "DB_PASSWORD=admin1", "login admin1 now", "DB_PASSWORD"],
	["Short Key", "API_KEY=abcd", "login abcd now", "API_KEY"],
] as const) {
	test(`${name}: a value of 4 to 7 characters under a secret key name is replaced as a whole word`, async ($: Engine, on: On) => {
		stub(on, { [`/p/${ENV}`]: `${line}\n` }, shown);
		expect((await bash($)).result).toBe(`login [value of ${key}] now`);
	});
}

test("Short Plain: a short value under a plain key name stays", async ($: Engine, on: On) => {
	const text = "port 8080 debug true";
	stub(on, { [`/p/${ENV}`]: "PORT=8080\nDEBUG=true\n" }, text);
	expect((await bash($)).result).toBe(text);
});

test("Short Inside: a short value inside a longer word stays", async ($: Engine, on: On) => {
	stub(on, { [`/p/${ENV}`]: "API_KEY=abcd\n" }, "abcde xabcd abcd_ abcd");
	expect((await bash($)).result).toBe("abcde xabcd abcd_ [value of API_KEY]");
});

test("Deep File: a value in a file 5 folders deep is replaced", async ($: Engine, on: On) => {
	stub(on, { [`/p/a/b/c/d/e/${ENV}`]: `API_TOKEN=${TOKEN}\n` }, `t ${TOKEN}`);
	expect((await bash($)).result).toBe("t [value of API_TOKEN]");
});

test("No Rg: the scan uses `find` when `rg` is missing", async ($: Engine, on: On) => {
	const files = { [`/p/x/${ENV}`]: `API_TOKEN=${TOKEN}\n` };
	stub(on, files, `t ${TOKEN}`, { scanning: { missing: true } });
	expect((await bash($)).result).toBe("t [value of API_TOKEN]");
});

test("Over The Bound: a scan over the bound of files adds one line that says some env files are not masked", async ($: Engine, on: On) => {
	const files: Record<string, string> = {};
	for (let i = 0; i < 1001; i++) {
		files[`/p/d${i}/${ENV}`] = `K${i}=value-number-${i}\n`;
	}
	stub(on, files, "x");
	expect(warned((await bash($)).context).length).toBe(1);
});

test("Under The Bound: a scan under the bound adds no line", async ($: Engine, on: On) => {
	stub(on, { [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n` }, "x");
	expect(warned((await bash($)).context)).toStrictEqual([]);
});

test("Long File: a file over the size bound adds the line", async ($: Engine, on: On) => {
	const text = `API_TOKEN=${TOKEN}\n${"#".repeat(300_000)}`;
	stub(on, { [`/p/${ENV}`]: text }, "x");
	expect(warned((await bash($)).context).length).toBe(1);
});
