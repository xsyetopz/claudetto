import type { On } from "claude-code";

const PATHS = Array.from({ length: 8 }, (_, i) => `.claude/skills/nope${i}/SKILL.md`);

// Each mode is one recorded arm's workload; the answer is the same in every arm, so only the settle time differs.
export const register = (on: On): void => {
	on("settings.read", async ($, e, next) => {
		const answer = await next(e);
		if (e.source && e.source !== "flag") {
			return answer;
		}
		const mode = (await $.env.get("RACE_MODE")) ?? "seq";
		if (mode === "one") {
			await $.fs.list(".claude/skills").catch(() => []);
		}
		if (mode === "store") {
			await $.store.get("held");
		}
		if (mode === "exists1") {
			await $.fs.exists(PATHS[0] as string);
		}
		if (mode === "write1") {
			await $.fs.write("race-log-write1", "x");
		}
		if (mode === "list4") {
			const home = await $.env.get("HOME");
			const config = (await $.env.get("CLAUDE_CONFIG_DIR")) ?? `${home}/.claude`;
			const dirs = [".claude/skills", ".claude/commands", `${config}/skills`, `${config}/commands`];
			await Promise.all(dirs.map((d) => $.fs.list(d).catch(() => [])));
		}
		if (mode === "par8") {
			await Promise.all(PATHS.map((p) => $.fs.exists(p)));
		}
		if (mode === "seq8") {
			for (const p of PATHS) {
				await $.fs.exists(p);
			}
		}
		if (mode === "date9") {
			const stamps = Array.from({ length: 9 }, () => Date.now());
			await $.fs.write("race-log-date9", JSON.stringify(stamps));
		}
		if (mode === "seq" || mode === "par") {
			const t0 = Date.now();
			await $.fs.write(`race-log-${mode}-start`, String(t0));
			const times: number[] = [];
			if (mode === "par") {
				await Promise.all(PATHS.map((p) => $.fs.exists(p)));
				times.push(Date.now() - t0);
			} else {
				for (const p of PATHS) {
					await $.fs.exists(p);
					times.push(Date.now() - t0);
				}
			}
			await $.fs.write(`race-log-${mode}-done`, JSON.stringify(times));
		}
		if (answer.deny !== undefined) {
			return answer;
		}
		const value = answer.value;
		return { ...answer, value: { ...value, skillOverrides: { ...(value.skillOverrides ?? {}), simplify: "off" } } };
	});
	on("session.start", async ($, e, next) => {
		const answer = await next(e);
		await $.store.set("held", ["simplify"]);
		return answer;
	});
};
