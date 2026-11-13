import type { EngineInterface, On, PluginOptions } from "claude-code";

import { isAbsent } from "../../absent";
import { switchOption } from "../../options";

const namesIn = async ($: EngineInterface, dir: string): Promise<string[]> => {
	try {
		const entries = await $.fs.list(dir);
		return entries.map((entry) => entry.name);
	} catch (error) {
		if (!isAbsent(error)) {
			$.ui.log(`The folder ${dir} was not listed (${String(error)})`);
		}
		return [];
	}
};

/** Claude Code makes `<base>/claude-<uid>/<project path with - for />/<session id>` for a session, and the uid and the project name stay out of this search. */
const folderOf = async ($: EngineInterface, base: string, session: string) => {
	const names = await namesIn($, base);
	const found = await Promise.all(
		names
			.filter((name) => name.startsWith("claude-"))
			.map(async (root) => {
				const inRoot = await namesIn($, `${base}/${root}`);
				const holds = await Promise.all(
					inRoot
						.filter((name) => name.startsWith("-"))
						.map(async (project) => {
							const inProject = await namesIn($, `${base}/${root}/${project}`);
							return inProject.includes(session)
								? [`${base}/${root}/${project}/${session}`]
								: [];
						}),
				);
				return holds.flat();
			}),
	);
	return found.flat();
};

/** Removes the temp folder of the session that ends, so a sweep has no folder of a finished session to find. */
export const sessionTempCleanup = (on: On, options: PluginOptions): void => {
	on("session.end", async ($, e, next) => {
		const answer = await next(e);
		if (!switchOption(options, "hygieneEnabled")) {
			return answer;
		}
		const named = await Promise.all([
			$.env.get("CLAUDE_CODE_TMPDIR"),
			$.env.get("TMPDIR"),
		]);
		const bases = [
			...new Set([
				...named.flatMap((base) =>
					base === undefined || base === "" ? [] : [base],
				),
				"/tmp",
			]),
		];
		const session = e.sessionId ?? (await $.session.id());
		if (session === undefined) {
			return answer;
		}
		const perBase = await Promise.all(
			bases.map((base) => folderOf($, base, session)),
		);
		const found = perBase.flat();
		if (found.length > 0) {
			await $.process
				.run(["rm", "-rf", ...found], { cwd: "/", timeoutMs: 1000 })
				.catch((error: unknown) => {
					$.ui.log(
						`The session temp folder was not removed (${String(error)})`,
					);
				});
		}
		return answer;
	});
};
