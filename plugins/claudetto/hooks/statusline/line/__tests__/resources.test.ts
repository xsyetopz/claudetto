import { describe, expect, test } from "claude-code/testing";

import { type Host, meminfoOf, probe, swapOf, treeOf } from "../resources";

const KIB = 1024;
const MIB = KIB ** 2;
const GIB = KIB ** 3;

/** A `ps -A -o pid=,ppid=,rss=,comm=` table: login shell 1 starts claude 10, which starts a shell, an MCP server and the status line's shell. */
const PS = [
	"    1     0   2048 /sbin/launchd",
	"   10     1 814288 claude",
	"   20    10   4096 /bin/zsh",
	"   21    10 102400 node",
	"   22    10  20480 /Users/u/.local/share/claude/versions/2.1.329",
	"   30    10   2048 /bin/sh",
	"   31    30  51200 bun",
	"   40     1 999999 /Applications/Other.app/Contents/MacOS/Other"
].join("\n");

const NO_FILES: Readonly<Record<string, string>> = {};

const hostOf = (over: Partial<Host>): Host => ({
	platform: "darwin",
	ppid: 30,
	loadavg: [1.5, 1, 1],
	cores: 8,
	totalmem: 32 * GIB,
	exec: () => Promise.resolve(""),
	read: (path) => Promise.resolve(NO_FILES[path]),
	...over
});

describe("machine figures", () => {
	test("reads swap from macOS vm.swapusage", () => {
		// Act
		const swap = swapOf(
			"total = 2048.00M  used = 1043.12M  free = 1004.88M  (encrypted)"
		);

		// Assert
		expect(swap).toEqual({ swapTotal: 2 * GIB, swapUsed: 1043.12 * MIB });
	});

	test("reads memory in use and swap from Linux /proc/meminfo", () => {
		// Act
		const found = meminfoOf(
			[
				"MemTotal:       16000000 kB",
				"MemAvailable:    4000000 kB",
				"SwapTotal:       2000000 kB",
				"SwapFree:        1500000 kB"
			].join("\n")
		);

		// Assert
		expect(found).toEqual({
			memPercent: 75,
			memTotal: 16_000_000 * KIB,
			swapTotal: 2_000_000 * KIB,
			swapUsed: 500_000 * KIB
		});
	});

	test("walks up from the status line's shell to claude and sums the processes under it", () => {
		// Act
		const tree = treeOf(PS, 30);

		// Assert
		expect(tree).toEqual({
			claude: 814_288 * KIB,
			tree: (814_288 + 4096 + 102_400 + 20_480 + 2048 + 51_200) * KIB,
			procs: 5,
			top: { name: "node", rss: 102_400 * KIB }
		});
	});

	test("names a native-installer build by claude, not by its version", () => {
		// Act
		const tree = treeOf(PS.replace("102400 node", "1024 node"), 30);

		// Assert
		expect(tree.top).toEqual({ name: "bun", rss: 51_200 * KIB });
		expect(treeOf(PS.replace("20480 /Users", "204800 /Users"), 30).top).toEqual(
			{
				name: "claude",
				rss: 204_800 * KIB
			}
		);
	});

	test("reports no process figures when no claude is above the command", () => {
		// Act and Assert
		expect(treeOf(PS, 40)).toEqual({});
	});

	test("probes macOS with sysctl and ps, memory in use as 100 minus the free level", async () => {
		// Arrange
		const host = hostOf({
			exec: (argv) =>
				Promise.resolve(
					argv[0] === "sysctl"
						? "74\ntotal = 2048.00M  used = 1024.00M  free = 1024.00M\n"
						: PS
				)
		});

		// Act
		const found = await probe(host);

		// Assert
		expect(found.memPercent).toBe(26);
		expect(found.swapUsed).toBe(GIB);
		expect(found.load).toBe(1.5);
		expect(found.cores).toBe(8);
		expect(found.claude).toBe(814_288 * KIB);
	});

	test("leaves out every figure whose source fails, and never throws", async () => {
		// Arrange
		const host = hostOf({ exec: () => Promise.reject(new Error("denied")) });

		// Act
		const found = await probe(host);

		// Assert
		expect(found).toEqual({ load: 1.5, cores: 8 });
	});
});
