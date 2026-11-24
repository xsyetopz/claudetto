// REQ-SKILLS-001 rerun of reports/2026-11-21-skills: a throwaway plugin named claudetto that holds
// only the shipped agents and, per variant, a `review` skill. Against the fake API, with an empty
// CLAUDE_CONFIG_DIR, it prints (a) the tools and Athena's prompt in the fork request of
// `/claudetto:review`, and (b) the skill-listing bytes of request 1 for `hi` with no skill, with the
// skill marked `disable-model-invocation: true`, and with the skill without it (the control).
// Usage: bun reports/2026-11-24-research/reverify/skills.ts
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { startFakeApi } from "../../../tools/measure-tools/fake-api";
import { toolsOf } from "../../../tools/measure-tools/measure";

const LISTING =
	"The following skills are available for use with the Skill tool";

const skill = (hidden: boolean): string =>
	[
		"---",
		"name: review",
		"description: Run when asked to review the uncommitted diff for bugs. Defects only.",
		...(hidden ? ["disable-model-invocation: true"] : []),
		"context: fork",
		"agent: claudetto:Athena",
		"---",
		"",
		"Review the working diff for defects only.",
		""
	].join("\n");

async function plugin(root: string, variant: "none" | "hidden" | "shown") {
	const dir = join(root, `plugin-${variant}`);
	await mkdir(join(dir, ".claude-plugin"), { recursive: true });
	await Bun.write(
		join(dir, ".claude-plugin", "plugin.json"),
		JSON.stringify({ name: "claudetto", version: "0.0.0" })
	);
	await cp(resolve("plugins/claudetto/agents"), join(dir, "agents"), {
		recursive: true
	});
	if (variant !== "none") {
		await Bun.write(
			join(dir, "skills", "review", "SKILL.md"),
			skill(variant === "hidden")
		);
	}
	return dir;
}

async function run(dir: string, prompt: string) {
	const config = await mkdtemp(join(tmpdir(), "reverify-skills-"));
	const api = startFakeApi(false);
	const proc = Bun.spawn(["claude", "-p", prompt, "--plugin-dir", dir], {
		cwd: config,
		stdout: "pipe",
		stderr: "pipe",
		env: {
			...process.env,
			CLAUDE_CONFIG_DIR: config,
			ANTHROPIC_BASE_URL: api.url,
			ANTHROPIC_API_KEY: "sk-ant-fake",
			DISABLE_TELEMETRY: "1"
		}
	});
	const stderr = await new Response(proc.stderr).text();
	await proc.exited;
	await api.stop();
	await rm(config, { recursive: true, force: true });
	return { requests: api.requests, stderr };
}

/** The skill-listing text block of a request, or "" when it has none. */
const listingOf = (body: unknown): string => {
	if (typeof body === "string") {
		const at = body.indexOf(LISTING);
		return at < 0 ? "" : body.slice(at);
	}
	if (body !== null && typeof body === "object") {
		for (const value of Object.values(body)) {
			const found = listingOf(value);
			if (found !== "") {
				return found;
			}
		}
	}
	return "";
};

const root = await mkdtemp(join(tmpdir(), "reverify-skills-plugins-"));
try {
	const fork = await run(await plugin(root, "hidden"), "/claudetto:review");
	for (const [i, r] of fork.requests.entries()) {
		const names = toolsOf(r.body).map(
			(t) => (t as { name?: string }).name ?? "?"
		);
		const text = JSON.stringify(r.body);
		console.log(
			`(a) request ${i + 1}: tools ${names.join(" ")}; Athena prompt ${text.includes("Sweep the change or system you are")}; skill body ${text.includes("Review the working diff")}`
		);
	}
	console.log(`(a) stderr: ${fork.stderr.trim().slice(0, 200) || "none"}`);
	for (const variant of ["none", "hidden", "shown"] as const) {
		const { requests } = await run(await plugin(root, variant), "hi");
		const listing = listingOf(requests[0]?.body);
		const lines = listing.split("\n").filter((l) => l.startsWith("- "));
		console.log(
			`(b) ${variant}: ${lines.length} skill lines, ${new TextEncoder().encode(listing).length} listing bytes, review listed ${listing.includes("claudetto:review")}`
		);
	}
} finally {
	await rm(root, { recursive: true, force: true });
}
