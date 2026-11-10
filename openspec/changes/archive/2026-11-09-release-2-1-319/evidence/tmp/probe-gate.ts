import { judge } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/rules.ts";
for (const c of process.argv.slice(2)) {
	const v = judge(c, () => false);
	console.log(JSON.stringify(c), "=>", v ? v.decision : "none");
}
