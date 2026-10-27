// Behavior of the JSON reads of `claudetto-sandbox`: an absent file and text that is not JSON are expected,
// and a file that cannot be read also gives null.
// Each test works in its own folder under `TMPDIR`.

import { expect, test } from "bun:test";
import { chmod, mkdir } from "node:fs/promises";
import path from "node:path";
import { which as bunWhich, write as bunWrite } from "bun";
import { parseJson, readJson } from "../../../dev/sandbox/adapters/login.ts";
import { availableModels } from "../../../dev/sandbox/adapters/setup.ts";
import { tmpDir } from "../../support/repo.ts";

const folder = () => tmpDir("lab-json");

test("text that is not JSON gives null", () => {
	expect(parseJson("{not json")).toBe(null);
	expect(parseJson('{"a":1}')).toStrictEqual({ a: 1 });
});

test("an absent file and a path under a file give null", async () => {
	const dir = await folder();
	await bunWrite(path.join(dir, "plain"), "x");
	expect(await readJson(path.join(dir, "none.json"))).toBe(null);
	expect(await readJson(path.join(dir, "plain", "inner.json"))).toBe(null);
});

test("a file with damaged JSON gives null", async () => {
	const dir = await folder();
	await bunWrite(path.join(dir, "bad.json"), "{");
	expect(await readJson(path.join(dir, "bad.json"))).toBe(null);
});

test("a folder in place of a file gives null", async () => {
	const dir = await folder();
	await mkdir(path.join(dir, "folder.json"));
	expect(await readJson(path.join(dir, "folder.json"))).toBe(null);
});

test("`availableModels` reads the list, and gives undefined when the settings are absent", async () => {
	const dir = await folder();
	expect(await availableModels(dir)).toBe(undefined);
	await bunWrite(
		path.join(dir, "settings.json"),
		JSON.stringify({ availableModels: ["claude-a"] }),
	);
	expect(await availableModels(dir)).toStrictEqual(["claude-a"]);
});

test("`which` skips a folder of `PATH` that is absent and finds a program in a later folder", async () => {
	const dir = await folder();
	const program = path.join(dir, "tool-x");
	await bunWrite(program, "#!/bin/sh\n");
	await chmod(program, 0o755);
	const PATH = [path.join(dir, "missing"), dir].join(path.delimiter);
	expect(bunWhich("tool-x", { PATH })).toBe(program);
	expect(bunWhich("tool-y", { PATH })).toBe(null);
});
