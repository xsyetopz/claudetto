import { mkdir, realpath } from "node:fs/promises";
import { join } from "node:path";
import { launchArm } from "../../src/ab/session.ts";
import type { Arm } from "../../src/arm/arm.ts";
import { DEFAULT_MODEL } from "../../src/shared/model.ts";

// Which classic hook events fire, and with what input, when a permission rule denies a tool call. $0: fake API only.
const PROBE = "denial-hooks";
const tmp = join(Bun.env.TMPDIR ?? "/tmp", "probe-denial-hooks");
await mkdir(join(tmp, "secret"), { recursive: true });
// A rule matches the resolved path, and `//` marks it absolute; one leading `/` is relative to the settings file.
const root = await realpath(tmp);
const SECRET = join(root, "secret", "canary.txt");
await Bun.write(SECRET, "CANARY\n");
const dump = join(root, `hooks-${Date.now()}.jsonl`);

const arm: Arm = {
	name: "deny-read",
	plugins: [{ dir: join(import.meta.dir, "plugin") }],
	settings: { permissions: { deny: [`Read(/${join(root, "secret")}/**)`] } },
	env: { DENIAL_DUMP: dump },
	model: DEFAULT_MODEL,
	expect: { plugins: ["denial"], model: DEFAULT_MODEL },
};

const { run } = await launchArm(
	arm,
	{ name: "deny", prompt: "go" },
	{
		probe: PROBE,
		plan: {
			steps: [
				{
					reply: {
						blocks: [
							{ type: "tool_use", name: "Read", input: { file_path: SECRET } },
							{ type: "tool_use", name: "Bash", input: { command: `cat ${SECRET}` } },
						],
						stop: "tool_use",
					},
				},
			],
			fallback: { blocks: [{ type: "text", text: "Done." }] },
		},
		launch: { mode: "stream-json", persist: true },
	},
);

const events = (await Bun.file(dump).exists()) ? (await Bun.file(dump).text()).trim().split("\n").map((l) => JSON.parse(l)) : [];
for (const e of events) {
	const { session_id, transcript_path, cwd, hook_event_name, ...rest } = e;
	console.log(hook_event_name, JSON.stringify(rest).slice(0, 400));
}
console.log("run", run.dir, "events", events.length);
