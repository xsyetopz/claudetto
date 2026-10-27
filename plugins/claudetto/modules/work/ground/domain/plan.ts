// The text of a call that `ground` checks: a write of a plan or a spec file.
// A number in a `#### Scenario:` block of a spec file, in a test file, or in a fixture is an input of a case, so the text skips it (design D10).

const PLAN_FILE =
	/(?:^|\/)openspec\/changes\/|(?:^|\/)(?:proposal|design|tasks)\.md$/;
const SPEC_FILE = /(?:^|\/)specs\/.+\/spec\.md$/;
const EXAMPLE_FILE = /\.test\.[cm]?[jt]sx?$|(?:^|\/)(?:__)?fixtures?(?:__)?\//;
const HEADING = /^#{1,4}\s/;
const SCENARIO = /^####\s+Scenario:/;

/** The tool input that the check reads. The hook gives the fields of the input on the event. */
interface PlanCall {
	tool: string;
	file_path?: string;
	content?: string;
	old_string?: string;
	new_string?: string;
}

/** `text` without its `#### Scenario:` blocks: a block runs to the next heading of level 4 or above. */
const withoutScenarios = (text: string): string => {
	let inside = false;
	return text
		.split("\n")
		.filter((line) => {
			if (HEADING.test(line)) {
				inside = SCENARIO.test(line);
			}
			return !inside;
		})
		.join("\n");
};

/** True when `old` stands in a `#### Scenario:` block of `file`, the text of the target before the edit. */
export const inScenario = (file: string, old: string): boolean => {
	const at = old === "" ? -1 : file.indexOf(old);
	if (at < 0) {
		return false;
	}
	const head = file
		.slice(0, at)
		.split("\n")
		.findLast((line) => HEADING.test(line));
	return head !== undefined && SCENARIO.test(head);
};

const newText = (call: PlanCall): string | undefined => {
	if (call.tool === "Write") {
		return call.content;
	}
	return call.tool === "Edit" ? call.new_string : undefined;
};

export const planText = (call: PlanCall): string | null => {
	const path = call.file_path ?? "";
	if (!PLAN_FILE.test(path) || EXAMPLE_FILE.test(path)) {
		return null;
	}
	const text = newText(call);
	if (text === undefined) {
		return null;
	}
	return SPEC_FILE.test(path) ? withoutScenarios(text) : text;
};

/** True when `path` is a plan or a spec file that `planText` checks: not a test or a fixture. */
export const isPlanFile = (path: string): boolean =>
	PLAN_FILE.test(path) && !EXAMPLE_FILE.test(path);
