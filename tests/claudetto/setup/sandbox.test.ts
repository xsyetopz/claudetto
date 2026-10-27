// Setup writes `sandbox.filesystem.denyRead` and `denyWrite` from the path lists of the gate (task 19.13 of change `redesign-0-4-0`).

import { expect, test } from "bun:test";
import { HOME_SECRETS } from "../../../plugins/claudetto/modules/gate/domain/paths.ts";
import { sandboxSnippet } from "../../../plugins/claudetto/modules/setup/domain/sandbox.ts";
import { runSetup } from "../../support/setup-run.ts";

const PATTERN_1 = /\/$/;

interface Settings {
	sandbox?: {
		enabled?: boolean;
		filesystem?: {
			denyRead?: string[];
			allowRead?: string[];
			denyWrite?: string[];
		};
	};
}

const filesystem = (settings: Settings) => settings.sandbox?.filesystem;

test("setup writes a denyRead entry for each secret path of the gate, with `~`", async () => {
	const { settings } = await runSetup({});
	expect(filesystem(settings)?.denyRead).toEqual(
		expect.arrayContaining(
			HOME_SECRETS.map((s) => `~/${s.replace(PATTERN_1, "")}`),
		),
	);
	expect(filesystem(settings)?.denyRead).toContain("~/.ssh");
});

// Under a `**/.env` deny, `bun` exits 1 in a folder with a `.env` file (`srt` 0.0.81, 2026-10-26).
test("setup writes no `.env` entry, so a tool that loads `.env` on its own still runs", async () => {
	const { settings } = await runSetup({});
	expect(
		filesystem(settings)?.denyRead?.filter((p) => p.includes(".env")),
	).toStrictEqual([]);
	expect(filesystem(settings)?.allowRead).toBeUndefined();
});

test("setup writes denyWrite for the system folders, and not for /usr/local", async () => {
	const { settings } = await runSetup({});
	const deny = filesystem(settings)?.denyWrite ?? [];
	expect(deny).toContain("/System");
	expect(deny).toContain("/Library");
	expect(deny).not.toContain("/usr");
	expect(deny).not.toContain("/usr/local");
	expect(deny.every((p) => p.startsWith("/"))).toBe(true);
});

test("setup keeps the entries that the user has, adds the missing ones, and does not turn the sandbox on", async () => {
	const { settings } = await runSetup({
		"settings.json": JSON.stringify({
			sandbox: {
				filesystem: { denyRead: ["~/mine", "~/.ssh"], denyWrite: ["/opt/x"] },
			},
		}),
	});
	const read = filesystem(settings)?.denyRead ?? [];
	expect(read.slice(0, 2)).toStrictEqual(["~/mine", "~/.ssh"]);
	expect(read.filter((p) => p === "~/.ssh")).toHaveLength(1);
	expect(read).toContain("~/.netrc");
	expect(filesystem(settings)?.denyWrite).toContain("/opt/x");
	expect(filesystem(settings)?.denyWrite).toContain("/System");
	expect(settings.sandbox?.enabled).toBeUndefined();
});

test("setup keeps sandbox.enabled as the user set it", async () => {
	const { settings } = await runSetup({
		"settings.json": JSON.stringify({ sandbox: { enabled: false } }),
	});
	expect(settings.sandbox?.enabled).toBe(false);
});

test("`sandboxSnippet` gives no children for a folder whose listing throws `EACCES`", async () => {
	const denied = async (): Promise<string[]> => {
		throw Object.assign(new Error("permission denied"), { code: "EACCES" });
	};
	const { filesystem: fs } = await sandboxSnippet(denied);
	expect(fs.denyWrite).toContain("/System");
	expect(fs.denyWrite).not.toContain("/usr");
});
