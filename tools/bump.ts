/**
 * Sets each named plugin's version in its `.claude-plugin/plugin.json`.
 * Usage: `bun tools/bump.ts <patch|minor|major|X.Y.Z> <plugin dir>...`
 *
 * A version with a pre-release or build suffix (`2.1.329+1`) is replaced by its SemVer core
 * (`2.1.329`) before the bump; a version with no core needs an explicit `X.Y.Z`.
 */
const [target = "", ...dirs] = Bun.argv.slice(2);
const parts = ["major", "minor", "patch"];
const exact = /^\d+\.\d+\.\d+$/u;
const semver = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/u;

const write = (line: string): void => {
	process.stdout.write(`${line}\n`);
};

function next(current: string, plugin: string): string {
	if (exact.test(target)) {
		return target;
	}
	const core = semver.exec(current);
	if (core === null) {
		throw new Error(
			`${plugin}: version "${current}" has no X.Y.Z core; set one, e.g. just bump ${plugin} 0.1.0`
		);
	}
	const at = parts.indexOf(target);
	const bumped = core.slice(1).map((n, i) => {
		if (i < at) {
			return Number(n);
		}
		return i === at ? Number(n) + 1 : 0;
	});
	return bumped.join(".");
}

async function bump(dir: string): Promise<boolean> {
	const path = `${dir}/.claude-plugin/plugin.json`;
	const plugin = dir.split("/").at(-1) ?? dir;
	try {
		const text = await Bun.file(path).text();
		const manifest: unknown = JSON.parse(text);
		const current =
			typeof manifest === "object" && manifest !== null && "version" in manifest
				? manifest.version
				: undefined;
		if (typeof current !== "string") {
			throw new TypeError(`${plugin}: ${path} has no "version" string`);
		}
		const version = next(current, plugin);
		await Bun.write(
			path,
			text.replace(/("version"\s*:\s*)"[^"]*"/u, `$1"${version}"`)
		);
		write(`${plugin} ${current} -> ${version}`);
		return true;
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		return false;
	}
}

if (dirs.length === 0 || !(exact.test(target) || parts.includes(target))) {
	console.error(
		"usage: bun tools/bump.ts <patch|minor|major|X.Y.Z> <plugin dir>..."
	);
	process.exitCode = 2;
} else {
	const done = await Promise.all(dirs.map((dir) => bump(dir)));
	process.exitCode = done.every(Boolean) ? 0 : 1;
}
