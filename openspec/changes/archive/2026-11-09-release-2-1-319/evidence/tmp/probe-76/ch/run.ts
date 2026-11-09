import { parse } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/shell-words.ts";
const t = await Bun.file(Bun.argv[2]!).text();
const blocks = t.split(/\n(?=@@)/);
