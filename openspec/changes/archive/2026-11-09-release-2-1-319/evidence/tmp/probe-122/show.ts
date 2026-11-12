import { sessions } from "./sess.ts";
const ss = await sessions();
console.log(ss.length);
const ids = process.argv.slice(2);
for (const s of ss.filter((s) => ids.some((i) => s.file.includes(i))))
	console.log(
		`##### ${s.arm} ${s.id} ${s.ts}\nTOOLS ${s.tools.join(",")}\nCMD ${s.commands.join(" ;; ").slice(0, 500)}\nREPLY\n${s.text}\n`,
	);
