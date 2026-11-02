import type { On, PluginOptions } from "claude-code";
import type { Block, BlockContext } from "../block.ts";

export const readGuard: Block = {
	id: "read-guard",
	kind: "policy",
	routes: ["tool.call"],
	needs: "2.1.314",
};

export const readGuardOn = (options: PluginOptions): boolean =>
	options["readGuardEnabled"] !== false;

const LOCK_FILES = new Set([
	"bun.lock",
	"bun.lockb",
	"package-lock.json",
	"npm-shrinkwrap.json",
	"pnpm-lock.yaml",
	"yarn.lock",
	"deno.lock",
	"Cargo.lock",
	"Gemfile.lock",
	"poetry.lock",
	"uv.lock",
	"Pipfile.lock",
	"composer.lock",
	"Package.resolved",
	"go.sum",
	"packages.lock.json",
	"conan.lock",
	"gradle.lockfile",
	"flake.lock",
]);

// `build/`, `dist/`, `target/`, `bin/`, and `obj/` are left out: projects name source folders so, and a false denial costs more than a whole read.
const GENERATED_FOLDERS = new Set([
	"node_modules",
	".next",
	"DerivedData",
	".build",
	"__pycache__",
	".venv",
	".gradle",
	".tox",
	".mypy_cache",
	".ruff_cache",
	".pytest_cache",
]);

const GENERATED_NAME = /\.(?:min\.js|min\.css|map)$/;
const SEPARATOR = /[\\/]/;

/** Whether the path names a lock file, a minified or map file, or a file under a generated folder. */
export const heavyFile = (path: string): boolean => {
	const segments = path.split(SEPARATOR);
	const name = segments.at(-1) ?? "";
	return (
		LOCK_FILES.has(name) ||
		GENERATED_NAME.test(name) ||
		segments.slice(0, -1).some((segment) => GENERATED_FOLDERS.has(segment))
	);
};

interface ReadInput {
	readonly file_path?: unknown;
	readonly limit?: unknown;
}

const REASON =
	"This file is a lock, generated, or build file, and a whole read costs far more context than it gives. Pass `offset` and `limit` for the part you need, search it with `rg` for the entry you need, or ask the package command (`bun pm ls`, `cargo tree`).";

/** Why a `Read` must not run whole, or `undefined` when it names no heavy file or carries a `limit`. */
export const refusalFor = (input: ReadInput): string | undefined =>
	typeof input.file_path === "string" &&
	input.limit === undefined &&
	heavyFile(input.file_path)
		? REASON
		: undefined;

export const attachReadGuard = (on: On, context: BlockContext): void => {
	on("tool.call", { tool: "Read" }, (_$, e, next) => {
		const reason = readGuardOn(context.options) ? refusalFor(e) : undefined;
		return reason === undefined ? next(e) : { deny: reason };
	});
};
