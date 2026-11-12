import { expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { spawn } from "bun";

import {
	loadTrash,
	PROJECT_TRASH,
} from "../../plugins/claudetto/hygiene/trash.ts";
import { tempDir } from "../temp.mock.ts";

type Rules = Awaited<ReturnType<typeof loadTrash>>["rules"];

const project = async () => {
	const proj = await tempDir("trash-rules-");
	await mkdir(join(proj, ".claude/claudetto"), { recursive: true });
	return proj;
};

const refusal = async (proj: string): Promise<unknown> => {
	try {
		await loadTrash(proj);
	} catch (error) {
		return error;
	}
	return "accepted";
};

const matchedBy = (rules: Rules, path: string) =>
	rules.some((rule) => !rule.temp && !rule.gcroot && rule.path.test(path));

test("a project file with useDefault drops disabled rules and adds its own", async () => {
	const proj = await project();
	await writeFile(
		join(proj, PROJECT_TRASH),
		`[extend]\nuseDefault = true\ndisabledRules = ["xcode"]\n\n[[rules]]\nid = "out"\npath = '''(?i)(?:^|/)OUT$'''\n`,
	);

	const loaded = await loadTrash(proj);
	const ids = loaded.rules.map((rule) => rule.id);
	const out = loaded.rules.find((rule) => rule.id === "out");

	expect(ids).toContain("swiftpm");
	expect(ids).not.toContain("xcode");
	expect(out?.path.test("a/out")).toBe(true);
});

test("a project file without useDefault replaces the plugin's rules", async () => {
	const proj = await project();
	await writeFile(
		join(proj, PROJECT_TRASH),
		`[[rules]]\nid = "only"\npath = '''^x$'''\n`,
	);

	const loaded = await loadTrash(proj);
	expect(loaded.rules.map((rule) => rule.id)).toEqual(["only"]);
});

test("a rule with a content regex or without a path is refused", async () => {
	const proj = await project();
	const file = join(proj, PROJECT_TRASH);
	await writeFile(file, `[[rules]]\nid = "a"\npath = "x"\nregex = "y"\n`);
	expect(String(await refusal(proj))).toContain("match folders by path only");
	await writeFile(file, `[[rules]]\nid = "a"\n`);
	expect(String(await refusal(proj))).toContain("needs an id and a path");
});

// 18.42: the folders each tool made in a probe, and names that must not match.
test("every folder a tool probe made matches a rule, and a bare generic name does not", async () => {
	const proj = await project();
	const { rules } = await loadTrash(proj);
	const matched = (path: string) => matchedBy(rules, path);
	const made = [
		"node_modules",
		"dist",
		".venv",
		".pdm-build",
		".tox",
		".mypy_cache",
		"htmlcov",
		"_build",
		"deps",
		"build",
		"elm-stuff",
		".dart_tool",
		"ios/Flutter/ephemeral",
		"lua_modules",
		".luarocks",
		"vendor",
		".terraform",
		".terragrunt-cache",
		".zig-cache",
		"zig-out",
		".cpcache",
		"target",
		"project/target",
		".gradle",
		".kotlin",
		"app/build",
		"CMakeFiles",
		"out/build",
		"builddir",
		".xmake",
		"autom4te.cache",
		".pio",
		"buck-out",
		".build",
		"vcpkg_installed",
		"build/vcpkg_installed",
		"buildtrees",
		".scala-build",
		".bsp",
		".direnv",
	];
	expect(made.filter((path) => !matched(path))).toEqual([]);
	expect(
		[
			"ephemeral",
			"local",
			"charts",
			"bin",
			"src",
			"result",
			"packages",
			"downloads",
		].filter((element) => matched(element)),
	).toEqual([]);
});

test("the plugin's trash file passes the gitleaks config check of betterleaks", async () => {
	const check = spawn([
		"betterleaks",
		"config",
		"check",
		"--no-banner",
		"-c",
		join(import.meta.dir, "../../plugins/claudetto/hygiene/trash.toml"),
	]);

	expect(await new Response(check.stdout).text()).toContain("OK: 37 rules");
});
