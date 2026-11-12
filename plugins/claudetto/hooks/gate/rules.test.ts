import { expect, test } from "claude-code/testing";

import { GATE_EDIT_FILE } from "../texts-gate.ts";
import { decision, NONE, withFiles } from "./rules.mock.ts";
import { judge } from "./rules.ts";

const DENIED = [
	"rm -rf /",
	"sh -c 'rm -rf /'",
	"echo hi > /etc/hosts",
	"echo hi | tee /etc/hosts",
	"cat > notes.txt",
	"tee notes.txt",
	"printf 'a' > notes.txt",
	"cat <<EOF > notes.txt\na\nEOF",
	"cat src/a.ts",
	"head -n 5 src/a.ts",
	"tail src/a.ts",
	"sed -n '1,5p' src/a.ts",
	"sed -i '' 's/a/b/' src/a.ts",
	"perl -pi -e 's/a/b/' src/a.ts",
	"git status && sed -i 's/a/b/' src/a.ts",
];

test("an in-place shell edit is told to use Edit on that file", () => {
	expect(judge("sed -i '' 's/a/b/' src/a.ts", NONE)?.reason).toBe(
		GATE_EDIT_FILE("src/a.ts"),
	);
});

for (const command of DENIED) {
	test(`denies ${command}`, () => {
		expect(decision(command)).toBe("deny");
	});
}

const PASSES = [
	"git show HEAD:src/a.ts",
	"rg foo src",
	"cat src/a.ts | wc -l",
	"head -n 5 src/a.ts | grep x",
	"ls -la",
	"[ -f x ] && echo y",
	"[[ -f x ]] && echo y",
	"if [ -d node_modules ]; then echo y; fi",
];

for (const command of PASSES) {
	test(`passes ${command}`, () => {
		expect(decision(command)).toBeUndefined();
	});
}

test("a file print is told to use Read, a whole-file write to use Write", () => {
	expect(judge("cat src/a.ts", NONE)?.reason).toContain(
		"`file_path` `src/a.ts`",
	);
	expect(judge("tee notes.txt", NONE)?.reason).toContain("Write");
	expect(judge("printf a > notes.txt", NONE)?.reason).toContain("Write");
});

test("A sed Range: the Read redirect names the file, never the sed script", () => {
	expect(judge("sed -n 370,376p hooks/texts.ts", NONE)?.reason).toContain(
		"`file_path` `hooks/texts.ts`",
	);
	expect(judge("sed -n -e 5p hooks/texts.ts", NONE)?.reason).toContain(
		"`file_path` `hooks/texts.ts`",
	);
});

test("A Count Flag: the Read redirect names the file, never the count", () => {
	for (const command of [
		"head -n 5 hooks/texts.ts",
		"tail -n +3 hooks/texts.ts",
		"sed -n -e 5p hooks/texts.ts",
	]) {
		expect(judge(command, NONE)?.reason).toContain(
			"`file_path` `hooks/texts.ts`",
		);
	}
});

test("A Count Flag: a count with no file reads stdin and passes", () => {
	for (const command of [
		"head -n 5",
		"tail -n +3",
		"head -n5",
		"sed -n -e 5p",
	]) {
		expect(decision(command)).toBeUndefined();
	}
});

test("A Compound Command: a read inside a compound command is sent to Read", () => {
	for (const command of [
		"git log -1 && head -5 CHANGELOG.md",
		"bun test; cat src/a.ts",
	]) {
		expect(decision(command)).toBe("deny");
	}
});

test("an unreadable command asks", () => {
	expect(decision("$HOME/bin/git push")).toBe("ask");
});

const BUN = withFiles("bun.lock");

for (const [command, equivalent] of [
	["npm install", "bun install"],
	["npm i left-pad", "bun add"],
	["npx tsc", "bunx"],
	["yarn add zod", "bun add"],
	["pnpm run build", "bun run"],
	["pnpx cowsay hi", "bunx"],
	["sudo npm install", "bun install"],
	["sh -c 'npm install'", "bun install"],
	["deno task dev", "bun run"],
	["npm ci", "bun install --frozen-lockfile"],
	["npm update", "bun update"],
	["pnpm view left-pad", "bun info"],
	["deno add zod", "bun add"],
	["deno x npm:cowsay", "bunx"],
] as const) {
	test(`bun.lock denies ${command} naming ${equivalent}`, () => {
		const verdict = judge(command, BUN);

		expect(verdict?.decision).toBe("deny");
		expect(verdict?.reason).toContain(equivalent);
	});
}

test("deno.json lets deno through under bun.lock", () => {
	expect(
		decision("deno task dev", withFiles("bun.lock", "deno.json")),
	).toBeUndefined();
});

for (const command of [
	"echo npm install",
	"grep npm package.json",
	"git commit -m 'npm install'",
	"git log --grep=yarn",
	"bun install",
	"deno test",
]) {
	test(`bun.lock passes ${command}`, () => {
		expect(decision(command, BUN)).toBeUndefined();
	});
}

test("no lock file, no package rule", () => {
	expect(decision("npm install")).toBeUndefined();
});

const XMAKE = withFiles("xmake.lua");

for (const [command, equivalent] of [
	["cmake --build build", "xmake build"],
	["make clean", "xmake build"],
	["ninja", "xmake build"],
	["conan install .", "xmake require"],
	["cmake -S . -B build", "xmake config"],
	["ninja -t clean", "xmake clean"],
	["make install", "xmake install"],
] as const) {
	test(`xmake.lua denies ${command} naming ${equivalent}`, () => {
		const verdict = judge(command, XMAKE);

		expect(verdict?.decision).toBe("deny");
		expect(verdict?.reason).toContain(equivalent);
	});
}

for (const [command, own] of [
	["cmake --build build", "CMakeLists.txt"],
	["ninja", "build.ninja"],
	["make", "Makefile"],
	["conan install .", "conanfile.txt"],
] as const) {
	test(`a ${own} lets ${command} through under xmake.lua`, () => {
		expect(decision(command, withFiles("xmake.lua", own))).toBeUndefined();
	});
}

for (const command of [
	"echo cmake --build build",
	"grep make Makefile",
	"git commit -m 'make clean'",
	"git log --grep=ninja",
	"xmake build",
]) {
	test(`xmake.lua passes ${command}`, () => {
		expect(decision(command, XMAKE)).toBeUndefined();
	});
}
