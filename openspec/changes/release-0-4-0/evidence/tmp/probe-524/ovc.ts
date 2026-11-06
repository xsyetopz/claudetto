// 5.24 c9 and ovc9-ovc13: the 18 prompt commands typed by the user, and a project skill and command under two of the names.
// Prediction: w0 typed commands make 0 requests; w1 lists simplify and batch and sends each body in 1 request.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { launchArm } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/ab/session.ts";
import { mainRequests, readRequests } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/fake/fake.ts";
import { DEFAULT_MODEL } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/shared/model.ts";

import { INTERVIEW_TEXT } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/texts.ts";
const PLUGIN = "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto";
const SETS: Record<string, [string, boolean, string][]> = {
	sl: [
		["sl2", false, "/statusline show the git branch"],
		["sl3", false, "/statusline"],
		["i1", false, "/init"],
	],
	ovc: [
	["c9-simplify", false, "/simplify x"],
	["c9-batch", false, "/batch x"],
	["c9-deep-research", false, "/deep-research x"],
	["c9-debug", false, "/debug x"],
	["c9-verify", false, "/verify x"],
	["c9-insights", false, "/insights x"],
	["ovc9", false, "hi"],
	["ovc10", true, "hi"],
	["ovc11", true, "/simplify x"],
	["ovc12", true, "/batch x"],
	["ovc13", false, "/simplify x"],
	],
};
const CASES = SETS[process.argv[2] ?? "ovc"] ?? [];

for (const [name, held, prompt] of CASES) {
	const { run, result, requests } = await launchArm(
		{ name: "surface", plugins: [{ dir: PLUGIN }], settings: {}, env: {}, model: DEFAULT_MODEL, expect: { plugins: ["claudetto"], model: DEFAULT_MODEL } },
		{ name, prompt },
		{
			probe: "ovc",
			plan: { steps: [], fallback: { blocks: [{ type: "text", text: "OK" }] } },
			launch: { mode: "text", settingSources: ["project"] },
			prepare: async (r) => {
				if (!held) return;
				const work = join(r.dir, "work");
				await mkdir(join(work, ".claude/skills/simplify"), { recursive: true });
				await mkdir(join(work, ".claude/commands"), { recursive: true });
				await Bun.write(join(work, ".claude/skills/simplify/SKILL.md"), "---\nname: simplify\ndescription: OV-SKILL user simplify\n---\nOV-SKILL-BODY\n");
				await Bun.write(join(work, ".claude/commands/batch.md"), "---\ndescription: OV-CMD user batch\n---\nOV-CMD-BODY\n");
			},
		},
	);
	const all = mainRequests(await readRequests(requests));
	const text = JSON.stringify(all.map((r) => r.body));
	const listed = ["simplify", "batch"].filter((n) => text.includes(`- ${n}:`));
	const out = (await Bun.file(result.files.stdout).text()).trim().slice(0, 120);
	const config = join(run.dir, "config", "settings.json");
	const statusLine = (await Bun.file(config).exists()) ? (await Bun.file(config).json()).statusLine : undefined;
	console.log(JSON.stringify({ name, statusLine: statusLine?.type, editText: text.includes("Set the user's status line to: show the git branch"), interview: text.includes(JSON.stringify(INTERVIEW_TEXT).slice(1, -1)), agentCall: text.includes("statusline-setup"), run: run.id, requests: all.length, listed, skillBody: text.includes("OV-SKILL-BODY"), cmdBody: text.includes("OV-CMD-BODY"), out }));
}
