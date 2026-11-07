// TUI case on the claudekit fake: bun tui.ts NAME TEXT DONE_REGEX [KEYS] [STEPS_JSON] [SETTINGS_JSON]
// Prints the request count, the run folder, and the screen log path (ANSI stripped copy beside it).
import { mkdir, realpath } from "node:fs/promises";
import { join } from "node:path";
import { startFake } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/fake/fake.ts";
import { createRun } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/workspace/workspace.ts";

const PLUGIN = process.env["TUI_PLUGIN"] ?? "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto";
const [name = "x", text = "hi", done = "OK", keys = "", steps = "[]", settings = "{}"] = process.argv.slice(2);
const run = await createRun({ probe: "tui" });
const cfg = join(run.dir, "config");
const work = join(run.dir, "work");
await mkdir(cfg, { recursive: true });
await mkdir(work, { recursive: true });
await Bun.write(
	join(cfg, ".claude.json"),
	JSON.stringify({
		hasCompletedOnboarding: true,
		lastReleaseNotesSeen: "2.1.318",
		lastClawdEntranceVersion: "2.1.318",
		hasSeenAutoDefaultNotice: true,
		numStartups: 200,
		customApiKeyResponses: { approved: ["sk-ant-fake-probe"], rejected: [] },
		projects: { [await realpath(work)]: { hasTrustDialogAccepted: true } },
	}),
);
const settingsFile = join(run.dir, "settings.json");
await Bun.write(settingsFile, settings);
const fake = await startFake({
	plan: { steps: JSON.parse(steps), fallback: { blocks: [{ type: "text", text: "OK" }] } },
	dir: join(run.dir, "requests"),
});
const log = join(run.dir, `${name}.tty`);
try {
	const p = Bun.spawn(["expect", "-f", "/tmp/probe-tui/tui.exp", log, fake.url, cfg, work, settingsFile, PLUGIN, text, done, keys], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const out = await new Response(p.stdout).text();
	await p.exited;
	const ms = out.match(/PROBE-MS (\S+)/)?.[1];
	const screen = (await Bun.file(log).text()).replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b[()][0-9A-B]|\x1b[=>]|\x1b\][^\x07]*\x07/g, "");
	await Bun.write(`${log}.txt`, screen);
	const reqs = (await Array.fromAsync(new Bun.Glob("*.body.json").scan(join(run.dir, "requests")))).length;
	console.log(JSON.stringify({ name, run: run.dir, ms, requests: reqs, exit: p.exitCode, probe: out.includes("input box not seen") ? "no input box" : "ok" }));
} finally {
	await fake.stop();
}
