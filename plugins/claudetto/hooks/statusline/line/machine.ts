import { type Ctx, type Text, words } from "./ctx";
import { bar, bytes, wholePercent } from "./format";

/** Cells in a machine bar, half a use bar so the row keeps room for the process figures. */
const CELLS = 5;

/** `mem ██░░░ 70% 32G`: memory in use by the kernel's measure, of the machine's total. */
const memText = ({ resources, paint }: Ctx): Text => {
	const percent = resources?.memPercent;
	if (percent === undefined) {
		return undefined;
	}
	const total = resources?.memTotal;
	return words(
		paint.dim("mem"),
		bar(percent, paint, CELLS),
		paint.level(percent)(`${wholePercent(percent)}%`),
		total !== undefined && total > 0 && paint.dim(bytes(total))
	);
};

/** `swap 1.0/2.0G`, shown once swap is in use. */
const swapText = ({ resources, paint }: Ctx): Text => {
	const used = resources?.swapUsed;
	const total = resources?.swapTotal;
	if (used === undefined || total === undefined || used <= 0) {
		return undefined;
	}
	return words(
		paint.dim("swap"),
		paint.level((100 * used) / total)(`${bytes(used)}/${bytes(total)}`)
	);
};

/** `load 1.9/10`: the one-minute load average over the logical cores. */
const loadText = ({ resources, paint }: Ctx): Text => {
	const load = resources?.load;
	const cores = resources?.cores;
	if (load === undefined || cores === undefined) {
		return undefined;
	}
	return words(
		paint.dim("load"),
		paint.level((100 * load) / cores)(`${load.toFixed(1)}/${cores}`)
	);
};

/** `claude 812M`: Claude Code's own resident memory. */
const claudeText = ({ resources, paint }: Ctx): Text => {
	const claude = resources?.claude;
	return claude === undefined
		? undefined
		: paint.model(`claude ${bytes(claude)}`);
};

/** `tree 2.5G 14 procs`: Claude Code with every process under it (shells, MCP servers, hooks). */
const treeText = ({ resources, paint }: Ctx): Text => {
	const tree = resources?.tree;
	const procs = resources?.procs;
	return tree === undefined || procs === undefined || procs === 0
		? undefined
		: paint.dim(`tree ${bytes(tree)} ${procs} procs`);
};

/** `top node 1.1G`: the process under Claude Code holding the most memory. */
const topText = ({ resources, paint }: Ctx): Text => {
	const top = resources?.top;
	return top === undefined
		? undefined
		: paint.dim(`top ${top.name} ${bytes(top.rss)}`);
};

/** The machine row's items. */
export const machineTexts = (ctx: Ctx): Text[] => [
	memText(ctx),
	swapText(ctx),
	loadText(ctx),
	claudeText(ctx),
	treeText(ctx),
	topText(ctx)
];
