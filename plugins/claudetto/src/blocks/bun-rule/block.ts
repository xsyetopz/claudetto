import type { On, PluginOptions } from "claude-code";
import type { Block, BlockContext } from "../block.ts";

export const bunRule: Block = {
	id: "bun-rule",
	kind: "session",
	routes: ["classic.SessionStart", "fs.exists"],
	needs: "2.1.314",
};

export const bunRuleOn = (options: PluginOptions): boolean =>
	options["bunRuleEnabled"] !== false;

/** The one text the block adds: the `bun` command for each job, so the model does not reach for `npm` or `node`. */
export const BUN_RULE =
	"This repo uses `bun`. Run its own script first, `bun run <name>` or a `justfile` recipe. Otherwise run `bun install` (`--frozen-lockfile` in CI), `bun add <pkg>` (`-d` dev, `-g` global), `bun remove <pkg>`, `bun <file>`, `bunx <pkg>`, `bun test`, `bun build <entry> --outdir <dir>`, `bun fmt`, `bun check` to type check, and `bunx <linter>` to lint.";

export const attachBunRule = (on: On, context: BlockContext): void => {
	// A `rules/` file of a plugin never loads, and the context of a `SessionStart` hook is lost after `clear` and `compact`, so those two add it again.
	on(
		"classic.SessionStart",
		{ source: ["startup", "clear", "compact"] },
		async ($, e, next) => {
			const answer = await next(e);
			if (!bunRuleOn(context.options) || e.cwd === undefined) {
				return answer;
			}
			const [manifest, lock] = await Promise.all([
				$.fs.exists(`${e.cwd}/package.json`),
				$.fs.exists(`${e.cwd}/bun.lock`),
			]);
			return manifest && lock
				? {
						...answer,
						additionalContext: [...(answer.additionalContext ?? []), BUN_RULE],
					}
				: answer;
		},
	);
};
