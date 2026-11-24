// REQ-REPLY-139 probe: a session where the user states opinions and one rule, then the handover fork prompt.
import { FORK_PROMPT } from "../../../plugins/claudetto/hooks/handover/text.ts";
const plug = `${import.meta.dir}/../../../plugins/claudetto`;
const root = `${process.env.TMPDIR}/r139`;
const say =
	"I think tabs are ugly and Python is an overrated language, honestly. Rule for this repo: indent with 2 spaces. Create hello.py that prints hi.";
const run = async (rep: number) => {
	const dir = `${root}/${rep}`;
	await Bun.$`rm -rf ${dir} && mkdir -p ${dir} && git -C ${dir} init -q`;
	const base = [
		"--model",
		"claude-sonnet-5-5",
		"--plugin-dir",
		plug,
		"--max-budget-usd",
		"0.5",
		"--permission-mode",
		"acceptEdits",
		"--setting-sources",
		"project",
		"--strict-mcp-config",
		"--output-format",
		"json"
	];
	const a = JSON.parse(await Bun.$`claude -p ${say} ${base}`.cwd(dir).text());
	const b = JSON.parse(
		await Bun.$`claude -p ${FORK_PROMPT} --resume ${a.session_id} ${base}`
			.cwd(dir)
			.text()
	);
	const text: string = b.result ?? "";
	await Bun.write(`${dir}/handover.md`, text);
	const lines = text
		.split("\n")
		.filter((l) =>
			/tabs? (are|is) ugly|overrated|dislikes? tabs|prefers? (not|against) python/i.test(
				l
			)
		);
	console.log(
		`rep=${rep} cost=${(a.total_cost_usd + b.total_cost_usd).toFixed(3)} rule=${/2 spaces|2-space|two spaces/i.test(text)} opinionLines=${lines.length} ${JSON.stringify(lines)}`
	);
};
await Promise.all([1, 2, 3].map(run));
