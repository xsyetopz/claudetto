const [cwd = ".", ...cmd] = Bun.argv.slice(2);
const start = performance.now();
const child = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
const output = Promise.all([
	new Response(child.stdout).text(),
	new Response(child.stderr).text(),
]);

const tree = async (): Promise<[number, number]> => {
	const out = await Bun.$`ps -axo pid=,ppid=,rss=`.text();
	const rows = out
		.trim()
		.split("\n")
		.map((l) => l.trim().split(/\s+/).map(Number));
	const ids = new Set([child.pid]);
	let grew = true;
	while (grew) {
		grew = false;
		for (const [pid, ppid] of rows)
			if (ids.has(ppid) && !ids.has(pid)) {
				ids.add(pid);
				grew = true;
			}
	}
	return [
		rows.filter(([pid]) => ids.has(pid)).reduce((s, [, , rss]) => s + rss, 0),
		ids.size,
	];
};

let peak = 0;
let procs = 0;
while (child.exitCode === null) {
	const [rss, n] = await tree();
	peak = Math.max(peak, rss);
	procs = Math.max(procs, n);
	await Bun.sleep(30);
}
const [out, err] = await output;
console.log(
	`${cmd.join(" ")} peak=${Math.round(peak / 1024)}MB procs=${procs} time=${Math.round(performance.now() - start)}ms exit=${child.exitCode}`,
);
console.log(`${out}\n${err}`.trim().split("\n").slice(-3).join("\n"));
