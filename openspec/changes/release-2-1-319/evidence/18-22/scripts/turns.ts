const f = process.argv[2]!;
const lines = (await Bun.file(f).text()).split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
for (const m of lines) {
	if (m.type === "assistant") {
		const c = m.message.content.map((b: any) => (b.type === "text" ? "TEXT:" + b.text.slice(0, 200).replace(/\n/g, " ") : b.type === "tool_use" ? "TOOL:" + JSON.stringify(b.input).slice(0, 100) : b.type)).join(" | ");
		console.log("A out=" + m.message.usage?.output_tokens, c);
	} else if (m.type === "user") {
		const c = Array.isArray(m.message.content) ? m.message.content.map((b: any) => (b.type === "tool_result" ? "RESULT:" + JSON.stringify(b.content).slice(0, 100) : b.type === "text" ? "TEXT:" + b.text.slice(0, 300).replace(/\n/g, " ") : b.type)).join(" | ") : String(m.message.content).slice(0, 300);
		console.log("U", c);
	} else if (m.type === "system" && m.subtype !== "init") console.log("S", m.subtype, JSON.stringify(m).slice(0, 200));
	else if (m.type === "result") console.log("R", m.usage.output_tokens, m.num_turns);
}
