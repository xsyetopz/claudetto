import type { On } from "claude-code";
import { MINIMUM_VERSION } from "../../tiers/disables.ts";
import type { Block, BlockContext } from "../block.ts";

const parts = (release: string): readonly number[] =>
	(release.split("-")[0] ?? "").split(".").map(Number);

const isBelowFloor = (release: string): boolean => {
	const [running, floor] = [parts(release), parts(MINIMUM_VERSION)];
	const differs = floor.findIndex((part, index) => part !== running[index]);
	return differs !== -1 && (running[differs] ?? 0) < (floor[differs] ?? 0);
};

const floorLine = (release: string): string =>
	`claudetto needs Claude Code ${MINIMUM_VERSION} or later, and this session runs ${release}. Run \`claude update\`.`;

export const versionFloor: Block = {
	id: "version-floor",
	kind: "session",
	routes: ["classic.SessionStart", "session.version"],
	needs: "2.1.314",
};

export const attachVersionFloor = (on: On, _context: BlockContext): void => {
	// The handoff block holds the unmatched `classic.SessionStart` hook, and the loader takes one per event.
	on("classic.SessionStart", { source: "startup" }, async ($, e, next) => {
		const { base } = await $.session.version();
		if (base !== undefined && isBelowFloor(base)) {
			$.ui.log(floorLine(base));
		}
		return next(e);
	});
};
