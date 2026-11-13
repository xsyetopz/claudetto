import { Glob } from "bun";

const [dir = "", from = "", to = "z", match] = Bun.argv.slice(2);
const pattern = new RegExp(
	match ?? "claude plugin test|just (check|lab|verify)|oxlint|bun test",
);
const rows: string[] = [];
for await (const path of new Glob("**/*.jsonl").scan(dir)) {
	for (const line of (await Bun.file(`${dir}/${path}`).text()).split("\n")) {
		if (!line.includes('"Bash"')) continue;
		const row = JSON.parse(line);
		if (
			row.timestamp === undefined ||
			row.timestamp < from ||
			row.timestamp > to
		)
			continue;
		for (const part of row.message?.content ?? []) {
			const command: string | undefined = part.input?.command;
			if (part.type === "tool_use" && command && pattern.test(command)) {
				rows.push(
					`${row.timestamp.slice(11, 19)} ${path.split("/").at(-1)?.slice(0, 14)} ${command.replace(/\s+/g, " ").slice(0, 110)}`,
				);
			}
		}
	}
}
console.log(rows.sort().join("\n"));
