import type { EngineInterface } from "claude-code";

import { fault } from "../shared/fault";
import { matchesGlobs, parseRule, stripComments } from "./rules";

/** The instruction files already shown this session, by absolute path. */
const shown = new Set<string>();

/** Forgets what was shown; a new session shows them again. */
export const resetShown = (): void => {
	shown.clear();
};

/** Every `.md` file under a rules directory, recursively; none when it is missing. */
async function ruleFiles($: EngineInterface, dir: string): Promise<string[]> {
	if (!(await $.fs.exists(dir))) {
		return [];
	}
	const entries = await $.fs.list(dir);
	const found = await Promise.all(
		entries.map(async (entry) => {
			const path = `${dir}/${entry.name}`;
			if (entry.kind === "dir") {
				const below = await ruleFiles($, path);
				return below;
			}
			return entry.kind === "file" && entry.name.endsWith(".md") ? [path] : [];
		})
	);
	return found.flat();
}

/** Every path-scoped rule under the roots: its file, globs and text. */
async function scopedRules(
	$: EngineInterface,
	roots: readonly string[]
): Promise<{ file: string; globs: string[]; text: string }[]> {
	const found = await Promise.all(roots.map((root) => ruleFiles($, root)));
	const rules = await Promise.all(
		found.flat().map(async (file) => {
			const { globs, text } = parseRule(await $.fs.read(file));
			return { file, globs, text };
		})
	);
	return rules.filter((rule) => rule.globs.length > 0 && rule.text !== "");
}

/**
 * The instructions a patch's files would have loaded had Read, Write or Edit
 * touched them: path-scoped rules whose `paths` match, and a subdirectory
 * CLAUDE.md or CLAUDE.local.md between the session directory and the file.
 * Each file is returned once per session; rules with no `paths` and the
 * directory's own and ancestors' CLAUDE.md loaded at launch, so they are skipped.
 *
 * @param $ The engine.
 * @param cwd The session directory, absolute.
 * @param paths Absolute paths the patch touched.
 * @returns One labelled text per newly shown instruction file.
 */
export async function instructionsFor(
	$: EngineInterface,
	cwd: string,
	paths: readonly string[]
): Promise<string[]> {
	// ENGINE(v2.1.330): path-scoped rules and nested CLAUDE.md load only for Read/Write/Edit; a plugin tool cannot trigger it.
	const out: string[] = [];
	try {
		const home = await $.env.get("HOME");
		const rules = await scopedRules($, [
			`${cwd}/.claude/rules`,
			...(home === undefined ? [] : [`${home}/.claude/rules`])
		]);
		const nested = await Promise.all(
			paths.map((abs) =>
				$.fs.ancestors({
					names: ["CLAUDE.md", "CLAUDE.local.md"],
					of: abs,
					below: cwd
				})
			)
		);
		for (const [n, abs] of paths.entries()) {
			const rel = abs.slice(cwd.length + 1);
			for (const rule of rules) {
				if (!shown.has(rule.file) && matchesGlobs(rule.globs, rel)) {
					shown.add(rule.file);
					out.push(`Rule ${rule.file} applies to ${rel}:\n${rule.text}`);
				}
			}
			for (const { dir, name, content } of nested[n] ?? []) {
				const key = `${dir}/${name}`;
				const text = stripComments(content);
				if (!shown.has(key) && text !== "") {
					shown.add(key);
					out.push(`Instructions ${key} apply to ${rel}:\n${text}`);
				}
			}
		}
	} catch (error) {
		// Instructions are a courtesy to the model; a failed read must not fail the patch.
		fault($, "patch instructions", error);
	}
	return out;
}
