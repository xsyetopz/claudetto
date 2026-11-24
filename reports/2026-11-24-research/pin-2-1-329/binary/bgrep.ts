const b = Buffer.from(await Bun.file(process.argv[2]!).arrayBuffer()).toString(
	"latin1"
);
for (const pat of process.argv.slice(3)) {
	let i = -1,
		n = 0;
	while ((i = b.indexOf(pat, i + 1)) >= 0 && n++ < 6)
		console.log(
			`[${pat}] ${b.slice(Math.max(0, i - 140), i + 160).replace(/[^\x20-\x7e]/g, "·")}`
		);
}
