import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const call = {
	tool: "Bash",
	input: { command: "ls" },
	isRunning: false,
	isErrored: false,
	isInterrupted: false,
};

test("a folded tool group reaches the engine expanded", async ($: Engine, on: On) => {
	const seen: boolean[] = [];
	on("ui.render", { component: "ToolGroup" }, (_$, e) => {
		seen.push(e.props.isExpanded);
		return { type: "Text", children: ["group"] };
	});
	await $.ui.mount({
		plugin: "claudetto",
		surface: "terminal",
		component: "ToolGroup",
		props: { calls: [call], isActive: false, isExpanded: false },
	});
	expect(seen).toEqual([true]);
});
