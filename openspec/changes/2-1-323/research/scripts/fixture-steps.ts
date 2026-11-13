// usage: bun fixture-steps.ts <out-steps.json> <out-expected.json>
// Reads every fixtures-*.ts under useBashRules/rules.generated and writes the stub's step file (40 Bash tool_use blocks per reply)
// plus the expected outcome per unique command: "block" when any fixture row names a rule id, "pass" when every row names none.
import { Glob } from "bun";

const [steps = "", expected = ""] = Bun.argv.slice(2);
const dir =
	"/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/tool.check/useBashRules/rules.generated";
const byCommand = new Map<string, Set<string>>();
for await (const file of new Glob("fixtures-*.ts").scan(dir)) {
	const module = await import(`${dir}/${file}`);
	for (const rows of Object.values(module) as {
		test: string;
		expect_ids: string[];
	}[][]) {
		for (const row of rows) {
			const ids = byCommand.get(row.test) ?? new Set<string>();
			for (const id of row.expect_ids) ids.add(id);
			byCommand.set(row.test, ids);
		}
	}
}
const commands = [...byCommand.keys()];
const batches: {
	name: string;
	input: { command: string; description: string };
}[][] = [];
for (let i = 0; i < commands.length; i += 40) {
	batches.push(
		commands.slice(i, i + 40).map((command) => ({
			name: "Bash",
			input: { command, description: "fixture" },
		})),
	);
}
await Bun.write(steps, JSON.stringify(batches));
await Bun.write(
	expected,
	JSON.stringify(
		commands.map((command) => ({
			command,
			ids: [...(byCommand.get(command) ?? [])],
		})),
	),
);
console.log(`${commands.length} unique commands, ${batches.length} batches`);
