import { judge as oldJ } from "/tmp/probe-old/rules-old.ts";
import { judge as newJ } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/rules.ts";

import { bad, ok } from "./fixtures.ts";
const no = () => false;
for (const c of [...bad, ...ok]) {
	const o = oldJ(c, no)?.decision ?? "pass";
	const n = newJ(c, no);
	console.log(
		JSON.stringify(c),
		"|",
		o,
		"|",
		n?.decision ?? "pass",
		"|",
		n?.reason.split(":").slice(0, 2).join(":").slice(0, 48) ?? "",
	);
}
