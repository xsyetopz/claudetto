import {
	call,
	GREEN_RUN,
	RED_RUN,
	type Samples,
	wrote
} from "./eval-case-samples";

// Shared pieces of the claudetto-spec grader samples: traces, file edits and test lines.

export const PASS_AT_END: Samples = {
	bad: [RED_RUN, `${GREEN_RUN}\n${RED_RUN}`],
	good: [GREEN_RUN, `${RED_RUN}\n${GREEN_RUN}`]
};
export const INSPECTED: Samples = {
	bad: [call("Read", "src/cart.ts")],
	good: [call("Read", "specs/cart.md")]
};
export const NO_SPECS: Samples = {
	bad: ["README.md\nspecs/cart.md\n"],
	good: ["README.md\nsrc/cart.ts\n"]
};
export const NEW_HEADING: Samples = {
	bad: [wrote("\n## CART-2 Line totals multiply price by quantity\n")],
	good: [wrote("\n## DISC-1 Percentage discount\n")]
};
export const SPEC_KEPT: Samples = {
	badFile: [["Then the total is 600", "Then the total is 700"]],
	goodFile: []
};
export const cites = (id: string): string => `test("${id} applies", () => {});`;
export const example = (
	total: number,
	percent: number,
	result: number
): string => `expect(applyDiscount(${total}, ${percent})).toBe(${result});`;
export const noEdit = (path: string): Samples => ({
	bad: [call("Edit", path)],
	good: [call("Read", path)]
});
export const names = (good: string, bad: string): Samples => ({
	bad: [bad],
	good: [good]
});
export const STAGE =
	'{"type":"tool_use","name":"Bash","input":{"command":"git add src/cart.test.ts"}}';
export const DISCOUNT =
	"export function applyDiscount(total: number, percent: number): number {";
export const SCENARIO =
	"\n## DISC-1 Percentage discount\n\nGiven a total of 995 cents\nWhen a 10 percent discount applies\nThen the total is 895\n";
