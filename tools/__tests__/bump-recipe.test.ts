import { afterEach, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const checkout = join(import.meta.dir, "..", "..");
const withJust = test.skipIf(Bun.which("just") === null);
const plugins = ["claudetto", "claudetto-you-should-know", "claudetto-spec"];
let root = "";

afterEach(() => rm(root, { force: true, recursive: true }));

/** A copy of the recipes and the bump tool, with each shipped plugin at the given version. */
async function repo(versions: Record<string, string>) {
	root = await mkdtemp(join(tmpdir(), "bump-recipe-"));
	await Promise.all(
		["justfile", "project.just", ".just", "tools/bump.ts"].map((file) =>
			cp(join(checkout, file), join(root, file), { recursive: true })
		)
	);
	await Promise.all(
		plugins.map(async (p) => {
			await mkdir(join(root, "plugins", p, ".claude-plugin"), {
				recursive: true
			});
			await writeFile(
				join(root, "plugins", p, ".claude-plugin", "plugin.json"),
				`{\n\t"name": "${p}",\n\t"version": "${versions[p] ?? "0.1.0"}",\n\t"keywords": ["x"]\n}\n`
			);
		})
	);
}

async function bump(...args: string[]) {
	const r = Bun.spawn(["just", "--no-deps", "bump", ...args], {
		cwd: root,
		stderr: "pipe",
		stdout: "pipe"
	});
	return {
		err: await new Response(r.stderr).text(),
		out: await new Response(r.stdout).text(),
		rc: await r.exited
	};
}

async function version(p: string): Promise<unknown> {
	const manifest: unknown = await Bun.file(
		join(root, "plugins", p, ".claude-plugin", "plugin.json")
	).json();
	return typeof manifest === "object" &&
		manifest !== null &&
		"version" in manifest
		? manifest.version
		: undefined;
}

withJust(
	"a bare bump raises the patch of one plugin and leaves the others",
	async () => {
		await repo({ claudetto: "0.2.0" });
		const r = await bump("claudetto");
		expect(r.rc).toBe(0);
		expect(r.out).toContain("claudetto 0.2.0 -> 0.2.1");
		expect(await version("claudetto")).toBe("0.2.1");
		expect(await version("claudetto-spec")).toBe("0.1.0");
	}
);

withJust(
	"bump all minor raises every shipped plugin and zeroes the patch",
	async () => {
		await repo({ claudetto: "0.2.3", "claudetto-spec": "1.4.9" });
		const r = await bump("all", "minor");
		expect(r.rc).toBe(0);
		expect(await version("claudetto")).toBe("0.3.0");
		expect(await version("claudetto-spec")).toBe("1.5.0");
		expect(await version("claudetto-you-should-know")).toBe("0.2.0");
	}
);

withJust(
	"a version with a build suffix is replaced by its core, then bumped",
	async () => {
		await repo({ claudetto: "2.1.329+1" });
		const r = await bump("claudetto");
		expect(r.rc).toBe(0);
		expect(await version("claudetto")).toBe("2.1.330");
	}
);

withJust(
	"an explicit version replaces any current one and keeps the file's layout",
	async () => {
		await repo({ claudetto: "2.1.329+1" });
		const r = await bump("claudetto", "0.2.0");
		expect(r.rc).toBe(0);
		const text = await Bun.file(
			join(root, "plugins", "claudetto", ".claude-plugin", "plugin.json")
		).text();
		expect(text).toBe(
			`{\n\t"name": "claudetto",\n\t"version": "0.2.0",\n\t"keywords": ["x"]\n}\n`
		);
	}
);

withJust(
	"a version with no X.Y.Z core fails and asks for an explicit one",
	async () => {
		await repo({ claudetto: "next" });
		const r = await bump("claudetto");
		expect(r.rc).not.toBe(0);
		expect(r.err).toContain("just bump claudetto 0.1.0");
		expect(await version("claudetto")).toBe("next");
	}
);

withJust("an unknown part changes nothing", async () => {
	await repo({});
	const r = await bump("claudetto", "huge");
	expect(r.rc).not.toBe(0);
	expect(await version("claudetto")).toBe("0.1.0");
});
