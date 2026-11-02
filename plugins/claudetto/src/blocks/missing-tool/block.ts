import type { On, PluginOptions } from "claude-code";
import { hostFromFiles } from "../../tiers/optional/host.ts";
import { installFor } from "../../tiers/optional/install.ts";
import { binaryNames, isOnPath } from "../../tiers/optional/locate.ts";
import { isQuiet, noticeKey, noticeLine } from "../../tiers/optional/notice.ts";
import { OPTIONAL_TOOLS } from "../../tiers/optional/tools.ts";
import type { Block, BlockContext } from "../block.ts";

export const missingTool: Block = {
	id: "missing-tool",
	kind: "session",
	routes: ["classic.SessionStart"],
	needs: "2.1.314",
};

export const missingToolOn = (options: PluginOptions): boolean =>
	options["missingToolNoticeEnabled"] !== false;

export const attachMissingTool = (on: On, context: BlockContext): void => {
	// Looks up the `PATH` folders with `$.fs.exists`: no model call, no process, and `$.ui.log` never reaches the model.
	on("classic.SessionStart", { source: "startup" }, async ($, e, next) => {
		if (!missingToolOn(context.options)) {
			return next(e);
		}
		const exists = (file: string) => $.fs.exists(file);
		const [path, os, architecture] = await Promise.all([
			$.env.get("PATH"),
			$.env.get("OS"),
			$.env.get("PROCESSOR_ARCHITECTURE"),
		]);
		const host = await hostFromFiles({ os, architecture }, exists);
		const hasBrew =
			host.platform !== "win32" &&
			(await isOnPath(["brew"], host, path, exists));
		await Promise.all(
			OPTIONAL_TOOLS.map(async (tool) => {
				if (isQuiet(await $.store.get(noticeKey(tool)), tool)) {
					return;
				}
				if (await isOnPath(binaryNames(tool, host), host, path, exists)) {
					return;
				}
				$.ui.log(noticeLine(tool, installFor(tool, host, hasBrew)));
				await $.store.set(noticeKey(tool), tool.version);
			}),
		);
		return next(e);
	});
};
