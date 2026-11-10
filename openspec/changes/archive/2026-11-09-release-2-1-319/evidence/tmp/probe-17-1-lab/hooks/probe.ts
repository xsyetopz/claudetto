import type { On } from "claude-code";
export const register = (on: On): void => {
	on("tool.check", async ($, e, next) => {
		const out: Record<string, unknown> = {};
		out.tmp = await $.fs
			.stat("/tmp", { resolve: true })
			.catch((x) => `ERR ${x}`);
		out.tmpfile = await $.fs
			.stat("/tmp/probe-17-1-sh2/l", { resolve: true })
			.catch((x) => `ERR ${x}`);
		out.gone = await $.fs
			.stat("/tmp/probe-17-1-sh2/nope.txt", { resolve: true })
			.catch((x) => `ERR ${x}`);
		out.tilde = await $.fs
			.stat("~", { resolve: true })
			.catch((x) => `ERR ${x}`);
		out.home = await $.process
			.run(["printenv", "HOME"])
			.catch((x) => `ERR ${x}`);
		const m = await $.session.messages();
		out.msgs = JSON.stringify(m).slice(0, 1500);
		await $.fs.write("/tmp/probe-17-1-out.json", JSON.stringify(out, null, 1));
		return next(e);
	});
};
