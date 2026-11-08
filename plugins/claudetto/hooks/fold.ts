import type { On } from "claude-code";

/** The collapsed "Ran N shell commands" row hides the calls; each one shows as its own row instead. */
export const fold = (on: On): void => {
	on("ui.render", { component: "ToolGroup" }, (_$, e, next) =>
		next({ ...e, props: { ...e.props, isExpanded: true } }),
	);
};
