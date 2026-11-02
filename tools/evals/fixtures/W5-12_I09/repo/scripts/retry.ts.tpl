import pRetry from "p-retry";

const [program, ...args] = process.argv.slice(2);
if (program === undefined) {
	throw new Error("usage: retry <command> [args]");
}

await pRetry(
	async () => {
		const child = Bun.spawn([program, ...args], { stdio: ["inherit", "inherit", "inherit"] });
		if ((await child.exited) !== 0) {
			throw new Error(`${program} failed`);
		}
	},
	{ retries: 5 },
);
