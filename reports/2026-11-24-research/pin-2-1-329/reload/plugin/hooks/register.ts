// The Mod worker has no `process` global, so OUT is read through $.env.
let lines = [];
const log = async ($, s) => {
	lines.push(s);
	await $.fs.write(
		(await $.env.get("OUT")) ?? "/tmp/reload-probe.txt",
		lines.join("\n") + "\n"
	);
};
export const register = (on) => {
	on("session.start", async ($, e, next) => {
		const r = await next(e);
		await log($, `start interactive=${e.isInteractive}`);
		try {
			const x = await $.command.run({ command: "reload-plugins" });
			await log($, `awaited ok ${JSON.stringify(x).slice(0, 300)}`);
		} catch (err) {
			await log($, `awaited err ${String(err).slice(0, 300)}`);
		}
		$.command
			.run({ command: "reload-plugins" })
			.then((x) => log($, `unawaited ok ${JSON.stringify(x).slice(0, 300)}`))
			.catch((err) => log($, `unawaited err ${String(err).slice(0, 300)}`));
		return r;
	});
	on("turn.complete", async ($, e, next) => {
		try {
			const x = await $.command.run({ command: "reload-plugins" });
			await log($, `turn ok ${JSON.stringify(x).slice(0, 300)}`);
		} catch (err) {
			await log($, `turn err ${String(err).slice(0, 300)}`);
		}
		return next(e);
	});
};
