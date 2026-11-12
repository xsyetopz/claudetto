// Free count: file results at the density measured on part1.txt (2.34 characters a token), the rest at 4.
const [file, out] = [process.argv[2]!, Number(process.argv[3] ?? 0)];
let total = 0;
const rows: string[] = [];
(await Bun.file(file).text())
	.trim()
	.split("\n")
	.forEach((raw, i) => {
		const b = JSON.parse(raw);
		let files = 0;
		for (const m of b.messages)
			if (Array.isArray(m.content))
				for (const c of m.content)
					if (
						c.type === "tool_result" &&
						typeof c.content === "string" &&
						c.content.length > 20000
					)
						files += c.content.length;
		const t = Math.ceil(files / 2.34 + (raw.length - files) / 4);
		total += t;
		rows.push(`#${i} msgs=${b.messages.length} tokens=${t}`);
	});
console.log(rows.join("\n"));
console.log(`total ${total} (+ ${out} output) = ${total + out}`);
