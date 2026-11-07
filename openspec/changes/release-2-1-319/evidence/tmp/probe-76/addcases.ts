import { parse, programOf } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/shell-words.ts";
const NEW = ["echo 2a>f", "echo 12>f", "a &&>(b)", "a &&>(;", "<&bashb&#=", "<&b&#=", "a <&b&c", "a&&b", "a||b", "a&b", "a;;b", "a & & b", "{$'2\\>(-c\\-", "echo $(echo \"abc", "echo $(echo 'abc", "bash <<< 'rm x'", "sh <<-EOF\nrm x\nEOF", "bash <<EOF\nrm x\nEOF", "bash -c 'rm x' <<< y", "nohup A=1 rm x", "nohup -x rm x", "time -p rm x", "time A=1 rm x", "command -v ls", "command A=1 ls", "builtin -x echo", "cat <(x)", "cat >(x)", "echo `a", "echo $'a\\'b'", "echo $'a", "echo \"a", "a <<EOF\nx\nEOF\nb"];
const out: string[] = [];
for (const c of NEW) { const p = parse(c); const e = JSON.stringify({ ...p, programs: p.commands.map((x) => programOf(x)) }); out.push(`\t[\n\t\t${JSON.stringify(c)},\n\t\t${JSON.stringify(e)},\n\t],`); console.error(JSON.stringify(c), "=>", e.slice(0, 200)); }
await Bun.write("/tmp/probe-76/newrows.txt", out.join("\n") + "\n");
