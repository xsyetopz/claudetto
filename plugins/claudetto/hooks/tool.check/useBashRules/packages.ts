import { gatePackage } from "../../texts-gate";
import type { Verdict } from "./verdict";

const BUN_FOR_NPM: Record<string, string> = {
	install: "bun install",
	i: "bun install",
	ci: "bun install --frozen-lockfile",
	add: "bun add",
	uninstall: "bun remove",
	remove: "bun remove",
	rm: "bun remove",
	update: "bun update",
	up: "bun update",
	upgrade: "bun update",
	run: "bun run",
	task: "bun run",
	"run-script": "bun run",
	test: "bun run test",
	t: "bun run test",
	exec: "bunx",
	dlx: "bunx",
	x: "bunx",
	view: "bun info",
	info: "bun info",
};

const BUN_LOCKS = ["bun.lock", "bun.lockb"];
const DENO_FILES = ["deno.json", "deno.jsonc", "deno.lock"];
const NPM_FAMILY = new Set(["npm", "npx", "yarn", "pnpm", "pnpx"]);
const DENO_PACKAGE = new Set(["install", "add", "remove", "task", "x"]);

const XMAKE_FOR: Record<string, { own: string[]; use: string }> = {
	cmake: { own: ["CMakeLists.txt"], use: "`xmake config`, `xmake build`" },
	ninja: { own: ["build.ninja"], use: "`xmake build`, `xmake clean`" },
	make: {
		own: ["Makefile", "makefile", "GNUmakefile"],
		use: "`xmake build`, `xmake install`, `xmake test`",
	},
	conan: { own: ["conanfile.py", "conanfile.txt"], use: "`xmake require`" },
};

/** The repo files `packageVerdict` asks about. */
export const POLICY_FILES: string[] = [
	...BUN_LOCKS,
	...DENO_FILES,
	"xmake.lua",
	...Object.values(XMAKE_FOR).flatMap((x) => x.own),
];

const bunFor = (name: string, args: string[]): string => {
	if (name === "npx" || name === "pnpx") {
		return "bunx";
	}
	const words = args.filter((a) => !a.startsWith("-"));
	const form = BUN_FOR_NPM[words[0] ?? "install"];
	return form === "bun install" && words.length > 1
		? "bun add"
		: (form ?? "the matching `bun` command (`bun --help`)");
};

/** Denies the build or package tool a repo's own file shows it does not use, and names the one it does. */
export const packageVerdict = (
	name: string,
	args: string[],
	has: (file: string) => boolean,
): Verdict | undefined => {
	const lock = BUN_LOCKS.find((item) => has(item));
	const verb = args.find((a) => !a.startsWith("-")) ?? "";
	const bunTool =
		NPM_FAMILY.has(name) ||
		(name === "deno" &&
			DENO_PACKAGE.has(verb) &&
			!DENO_FILES.some((item) => has(item)));
	if (lock !== undefined && bunTool) {
		return {
			decision: "deny",
			reason: gatePackage(lock, `\`${bunFor(name, args)}\``, name),
		};
	}
	const xmake = XMAKE_FOR[name];
	return xmake && has("xmake.lua") && !xmake.own.some(has)
		? { decision: "deny", reason: gatePackage("xmake.lua", xmake.use, name) }
		: undefined;
};
