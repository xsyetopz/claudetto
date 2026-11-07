import { judge } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/rules.ts";
const cmds = (await Bun.stdin.text()).split("\n").filter(Boolean);
for (const c of cmds) { const v = judge(c, ()=>false); console.log(JSON.stringify(c), "=>", v?.decision, (v?.reason??"").slice(0,30)); }
