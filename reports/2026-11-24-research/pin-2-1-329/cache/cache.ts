// Per main-thread request cache hit = read / (read + write + input), deduped by message id.
for (const f of process.argv.slice(2)) {
	const seen = new Map<string, any>();
	for (const line of (await Bun.file(f).text()).split("\n")) {
		if (!line) continue;
		let e: any;
		try {
			e = JSON.parse(line);
		} catch {
			continue;
		}
		if (e.type === "assistant" && !e.parent_tool_use_id && e.message?.usage)
			seen.set(e.message.id, e.message.usage);
	}
	const hits = [...seen.values()].map((u) => {
		const r = u.cache_read_input_tokens ?? 0,
			w = u.cache_creation_input_tokens ?? 0,
			i = u.input_tokens ?? 0;
		return ((100 * r) / (r + w + i)).toFixed(1);
	});
	console.log(f.split("/").at(-2), hits.join(" "));
}
