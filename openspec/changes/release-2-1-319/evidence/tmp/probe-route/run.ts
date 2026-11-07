import type { Arm } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/arm/arm.ts";
import { launchArm } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/ab/session.ts";
import { DEFAULT_MODEL } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/shared/model.ts";
import { mkdirSync, writeFileSync } from "node:fs";
// usage: run.ts <none|root|hook|arm|user> [sandbox-json] ; env ALLOW_BASH=1 pre-allows Bash; commands in cmds.json
const mode = process.argv[2] ?? "none";
const cmds: { command: string; dangerouslyDisableSandbox?: boolean }[] = JSON.parse(await Bun.file(process.env.CMDS ?? "/tmp/probe-route/cmds.json").text());
const extra = process.argv[3] ? JSON.parse(process.argv[3]) : {};
const plug = mode === "root" || mode === "hook";
const arm: Arm = {
	name: "route",
	plugins: plug ? [{ dir: `/tmp/probe-route/${mode}` }] : [],
	settings: { ...(process.env.ALLOW_BASH ? { permissions: { allow: ["Bash"] } } : {}), ...(mode === "arm" ? { sandbox: extra } : {}) },
	env: process.env.PROBE_SANDBOX ? { PROBE_SANDBOX: process.env.PROBE_SANDBOX } : {},
	model: DEFAULT_MODEL,
	expect: { plugins: plug ? [`pr-${mode}`] : [], model: DEFAULT_MODEL },
};
const { run } = await launchArm(arm, { name: "n", prompt: "go" }, {
	probe: "sbx-route",
	plan: { steps: cmds.map((input) => ({ reply: { blocks: [{ type: "tool_use", name: "Bash", input }], stop: "tool_use" } })), fallback: { blocks: [{ type: "text", text: "Done." }] } },
	launch: { mode: "stream-json", persist: false, settingSources: mode === "user" ? ["user"] : [] },
	prepare: async (r) => { if (process.env.PKG) { mkdirSync(`${r.dir}/work`, { recursive: true }); writeFileSync(`${r.dir}/work/package.json`, '{"name":"t","dependencies":{"is-odd":"3.0.1"}}'); } if (process.env.GITINIT) { mkdirSync(`${r.dir}/work`, { recursive: true }); Bun.spawnSync(["git", "init", "-q", `${r.dir}/work`]); } if (mode === "user") { mkdirSync(`${r.dir}/config`, { recursive: true }); writeFileSync(`${r.dir}/config/settings.json`, JSON.stringify({ sandbox: extra })); } },
});
console.log(run.dir);
