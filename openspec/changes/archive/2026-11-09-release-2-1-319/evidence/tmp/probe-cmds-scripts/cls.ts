import { GENERATED as g } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/rules.generated.ts";
import { judge } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/rules.ts";
import { parse } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/shell-words.ts";
import { ruleHits } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/upstream.ts";
let pos = 0,
	hit = 0,
	unread: string[] = [],
	win = 0,
	rest: string[] = [],
	neg = 0,
	negclean = 0,
	negx: string[] = [];
for (const f of g.fixtures) {
	const p = parse(f.test);
	const h = ruleHits(f.test, p.unreadable ? [] : p.commands).map((r) => r.id);
	if (f.expect_ids.length) {
		pos++;
		if (f.expect_ids.every((i) => h.includes(i))) hit++;
		else if (f.expect_ids.every((i) => i.startsWith("fs:windows_"))) win++;
		else if (p.unreadable && judge(f.test, () => false)) unread.push(f.test);
		else rest.push(JSON.stringify([f.test, h, f.expect_ids]));
	} else {
		neg++;
		if (!h.length) negclean++;
		else negx.push(f.test + " => " + h.join(","));
	}
}
console.log({
	total: g.fixtures.length,
	pos,
	hit,
	win,
	unread: unread.length,
	rest: rest.length,
	neg,
	negclean,
});
console.log(unread.join("\n"));
console.log(rest.join("\n"));
console.log(negx.join("\n"));
