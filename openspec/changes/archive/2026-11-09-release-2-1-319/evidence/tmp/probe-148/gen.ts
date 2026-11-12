// Writes N files of pseudo-prose lines, each about 22k tokens when Read.
const words = (await Bun.file("/usr/share/dict/words").text())
	.split("\n")
	.filter((w) => /^[a-z]{3,9}$/.test(w));
let seed = 12345;
const rnd = () =>
	(seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const [dir, n, lines] = [
	process.argv[2]!,
	Number(process.argv[3]),
	Number(process.argv[4]),
];
for (let f = 1; f <= n; f++) {
	const out: string[] = [];
	for (let i = 0; i < lines; i++)
		out.push(
			Array.from(
				{ length: 7 },
				() => words[Math.floor(rnd() * words.length)],
			).join(" "),
		);
	await Bun.write(`${dir}/part${f}.txt`, out.join("\n") + "\n");
}
