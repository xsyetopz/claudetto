// usage: bun fixture-outcomes.ts <hook.log> <debug.log> <expected.json> <out.json>
// Joins the PreToolUse and PermissionRequest hook lines with the debug file's `tool_dispatch_start` lines into one outcome per command:
//   allow       the call started (an allow rule or a built-in read-only check)
//   ask-rule    a PermissionRequest fired with no `permission_suggestions` key (an `ask` rule matched)
//   ask         a PermissionRequest fired with the key (no rule matched, the default prompt)
//   deny        a PreToolUse fired and nothing else (a `deny` rule matched)
const [hookLog = "", debugLog = "", expectedFile = "", out = ""] =
	Bun.argv.slice(2);

const lines = (await Bun.file(hookLog).text())
	.split("\n")
	.filter((l) => l.startsWith("{"));
const calls = new Map<string, string>();
const asks = new Map<string, boolean>();
for (const line of lines) {
	const row = JSON.parse(line);
	if (row.hook_event_name === "PreToolUse")
		calls.set(row.tool_use_id, row.tool_input.command);
	if (row.hook_event_name === "PermissionRequest")
		asks.set(row.tool_input.command, "permission_suggestions" in row);
}
const started = new Set(
	[
		...(await Bun.file(debugLog).text()).matchAll(
			/tool_dispatch_start tool=Bash toolUseId=(\S+)/g,
		),
	].map((m) => m[1]),
);
const outcome = new Map<string, string>();
for (const [id, command] of calls) {
	if (started.has(id)) outcome.set(command, "allow");
	else if (asks.has(command))
		outcome.set(command, asks.get(command) ? "ask" : "ask-rule");
	else outcome.set(command, "deny");
}
const expected: { command: string; ids: string[] }[] =
	await Bun.file(expectedFile).json();
const rows = expected.map((e) => ({
	...e,
	outcome: outcome.get(e.command) ?? "missing",
}));
await Bun.write(out, JSON.stringify(rows));
const tally: Record<string, number> = {};
for (const r of rows) {
	const key = `${r.ids.length > 0 ? "expect-block" : "expect-pass"} -> ${r.outcome}`;
	tally[key] = (tally[key] ?? 0) + 1;
}
console.log(tally);
