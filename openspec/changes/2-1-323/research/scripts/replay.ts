import { Glob } from "bun";

const [dir = "", root = "", target = "", from = "", to = "z"] =
	Bun.argv.slice(2);
type Use = {
	at: string;
	id: string;
	name: string;
	input: Record<string, string>;
};
const uses: Use[] = [];
const failed = new Set<string>();
for await (const path of new Glob("**/*.jsonl").scan(dir)) {
	for (const line of (await Bun.file(`${dir}/${path}`).text()).split("\n")) {
		if (!(
			line.includes('"Edit"') ||
			line.includes('"Write"') ||
			line.includes("is_error")
		))
			continue;
		const row = JSON.parse(line);
		for (const part of row.message?.content ?? []) {
			if (part.type === "tool_result" && part.is_error)
				failed.add(part.tool_use_id);
			if (
				part.type === "tool_use" &&
				(part.name === "Edit" || part.name === "Write") &&
				row.timestamp >= from &&
				row.timestamp <= to
			) {
				uses.push({
					at: row.timestamp,
					id: part.id,
					name: part.name,
					input: part.input,
				});
			}
		}
	}
}
let applied = 0;
const missed: string[] = [];
for (const use of uses.sort((a, b) => a.at.localeCompare(b.at))) {
	if (failed.has(use.id) || !use.input.file_path?.startsWith(root)) continue;
	const file = Bun.file(target + use.input.file_path.slice(root.length));
	if (use.name === "Write") {
		await Bun.write(file, use.input.content ?? "");
		applied++;
		continue;
	}
	const text = (await file.exists()) ? await file.text() : "";
	const old = use.input.old_string ?? "";
	if (!text.includes(old)) {
		missed.push(`${use.at} ${use.input.file_path.slice(root.length)}`);
		continue;
	}
	await Bun.write(
		file,
		use.input.replace_all
			? text.replaceAll(old, use.input.new_string ?? "")
			: text.replace(old, () => use.input.new_string ?? ""),
	);
	applied++;
}
console.log(`applied=${applied} missed=${missed.length}`);
console.log(missed.join("\n"));
