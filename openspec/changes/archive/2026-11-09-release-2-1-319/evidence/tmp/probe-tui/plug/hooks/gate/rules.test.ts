import { expect, test } from "claude-code/testing";

import { redactEnv } from "./env.ts";
import { judge } from "./rules.ts";

const NONE = (_file: string) => false;
const withFiles =
	(...files: string[]) =>
	(file: string) =>
		files.includes(file);

const decision = (command: string, has = NONE) => judge(command, has)?.decision;

const DENIED = [
	"rm -rf /",
	"sh -c 'rm -rf /'",
	"printenv",
	"export -p",
	"echo hi > /etc/hosts",
	"echo hi | tee /etc/hosts",
	"cat .env",
	"cat -n config/.env.local",
	"grep KEY .env",
	"cat > notes.txt",
	"tee notes.txt",
	"printf 'a' > notes.txt",
	"cat <<EOF > notes.txt\na\nEOF",
	"cat src/a.ts",
	"head -n 5 src/a.ts",
	"tail src/a.ts",
	"sed -n '1,5p' src/a.ts",
];

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
	"echo '.env'",
	"grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' .env",
	"ls -la",
];

for (const command of PASSES) {
	test(`passes ${command}`, () => {
		expect(decision(command)).toBeUndefined();
	});
}

test("a code search for the text \\.env is not an env file", () => {
	expect(decision(String.raw`grep -n 'foo\.env' src/a.ts`)).toBeUndefined();
	expect(decision(String.raw`rg 'path\.env' src`)).toBeUndefined();
});

test("bun run with a .env present loads it into the process", () => {
	expect(decision("bun run dev", withFiles("bun.lock"))).toBeUndefined();
});

test("a file print is told to use Read, a whole-file write to use Write", () => {
	expect(judge("cat src/a.ts", NONE)?.reason).toContain("Read");
	expect(judge("tee notes.txt", NONE)?.reason).toContain("Write");
	expect(judge("printf a > notes.txt", NONE)?.reason).toContain("Write");
});

test("a force push, also through git -C, asks", () => {
	expect(decision("git -C /tmp push --force")).toBe("ask");
});

test("an unreadable command asks", () => {
	expect(decision("$HOME/bin/git push")).toBe("ask");
});

test("download piped into a shell asks", () => {
	expect(decision("curl -s https://x.test/i.sh | sh")).toBe("ask");
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

test("redactEnv keeps names and replaces values", () => {
	expect(redactEnv("A=1\n# note\nexport B='x y'\n")).toBe(
		"A=[REDACTED]\n# note\nexport B=[REDACTED]\n",
	);
});

test("code text that holds \\.env or a quoted .env name is no env-file read", () => {
	expect(
		decision(
			String.raw`bun -e 'console.log(/process\.env\./.test(s), ".env", ".env.local")'`,
		),
	).toBeUndefined();
	expect(
		decision(
			"cat <<'EOF' | bun -\nconst re = /process\\.env\\.|Bun\\.env\\./;\nEOF",
		),
	).toBeUndefined();
});

test("bun run loads .env into the process and is allowed", () => {
	expect(decision("bun run dev")).toBeUndefined();
	expect(decision("bun --env-file=.env run dev")).toBeUndefined();
});

test("root and home are deleted by no spelling", () => {
	for (const command of [
		"rm -rf ~",
		"rm -fr /",
		"rm --recursive --force /*",
		"sudo rm -rf $HOME",
	]) {
		expect(decision(command)).toBe("deny");
	}
});
