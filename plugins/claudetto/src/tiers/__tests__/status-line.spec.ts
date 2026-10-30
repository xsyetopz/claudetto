import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "bun";
import { applyTier } from "../merge.ts";
import { tierReport } from "../report.ts";
import { tierSnippet } from "../snippet.ts";
import { LAUNCHER_PATH, STATUSLINE_COMMAND } from "../status-line.ts";
import { SNIPPET_ROW } from "../tiers.ts";

const snippet = () => tierSnippet(SNIPPET_ROW, "darwin");

describe("the status line keys", () => {
	test("an empty file gets both lines, each a command of the launcher", () => {
		const { settings } = applyTier({}, snippet());

		expect(settings["statusLine"]).toEqual({
			type: "command",
			command: STATUSLINE_COMMAND,
			refreshInterval: 5,
		});
		expect(settings["subagentStatusLine"]).toEqual({
			type: "command",
			command: `${STATUSLINE_COMMAND} --subagent`,
		});
	});

	test("a user's own `statusLine` stays whole, with no key of ours mixed in", () => {
		const mine = { type: "command", command: "~/bin/my-line" };

		const { settings } = applyTier({ statusLine: mine }, snippet());

		expect(settings["statusLine"]).toEqual(mine);
	});

	test("the report names a kept user line once, as a whole", () => {
		const mine = { type: "command", command: "~/bin/my-line" };

		const applied = applyTier({ statusLine: mine }, snippet());
		const report = tierReport(undefined, applied);

		expect(
			report.split("\n").filter((line) => line.includes("statusLine")),
		).toEqual([
			`Skipped statusLine: you set it, your value ${JSON.stringify(mine)} stays. The row has ${JSON.stringify(snippet()["statusLine"])}.`,
		]);
	});

	test("a second run finds our own lines in place and reports no skip for them", () => {
		const first = applyTier({}, snippet()).settings;

		const second = applyTier(first, snippet());

		expect(
			second.skipped.filter((skip) => skip.path.endsWith("tatusLine")),
		).toEqual([]);
	});

	test("the launcher picks the newest cached version, so an update needs no new setup", async () => {
		const home = await mkdtemp(join(tmpdir(), "claudetto-line-"));
		const cache = join(home, ".claude/plugins/cache/claudetto/claudetto");
		await Promise.all(
			["0.2.0", "0.9.0", "0.10.0"].map((version) =>
				mkdir(join(cache, version, "bin"), { recursive: true }),
			),
		);

		const run = spawn(["sh", "-c", `printf %s "${LAUNCHER_PATH}"`], {
			env: { HOME: home, PATH: process.env["PATH"] ?? "" },
		});
		const printed = await new Response(run.stdout).text();
		await rm(home, { recursive: true });

		expect(printed).toBe(join(cache, "0.10.0", "bin", "claudetto-statusline"));
	});
});
