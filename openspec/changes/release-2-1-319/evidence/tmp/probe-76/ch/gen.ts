import { parse } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/shell-words.ts";
import { CMDS } from "./cmds.ts";
for (const c of CMDS) { const p = parse(c); console.log(JSON.stringify(c), "=>", p.unreadable?"UNREAD":"", p.commands.map(x=>JSON.stringify(x.words)+(x.dynamic.length?"d"+x.dynamic:"")+(x.redirects.length?"r"+x.redirects.map(r=>r.op+r.target):"")+(x.from?"F":"")+(x.into?"I":"")).join(" ; ")); }
