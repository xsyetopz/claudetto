// Print each stream-json frame of one run: type, message id, usage, content head.
import { readFileSync } from "node:fs";
for (const line of readFileSync(process.argv[2] ?? "", "utf8").split("\n")) {
	if (!line) continue;
	const o = JSON.parse(line);
	const m = o.message ?? {};
	const u = m.usage ?? {};
	const body = m.content === undefined ? JSON.stringify({ ...o, message: undefined }) : JSON.stringify(m.content);
	console.log(o.type, o.subtype ?? "", String(m.id ?? "").slice(-6), u.input_tokens, u.cache_creation_input_tokens, u.cache_read_input_tokens, body.slice(0, 260));
}
