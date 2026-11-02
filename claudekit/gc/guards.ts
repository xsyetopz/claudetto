// The two tests that keep a folder in use: a process whose cwd is in it, and a live `tmux` server on a socket in it.

import { lstat, readdir } from "node:fs/promises";
import { join } from "node:path";
import { connect } from "bun";
import { type CommandRunner, spawnCommand } from "../session/command.ts";

/** Gives every path that is some process's cwd. Injected so a test names them. */
export type CwdLister = () => Promise<readonly string[]>;

/** Tells whether a server answers on the socket. Injected so a test needs no `tmux`. */
export type SocketProbe = (socket: string) => Promise<boolean>;

/** The cwd paths in the `lsof -d cwd -Fn` output `text`: the lines that start with `n`. */
export const cwdPaths = (text: string): string[] =>
	text
		.split("\n")
		.filter((line) => line.startsWith("n/"))
		.map((line) => line.slice(1));

/** One `lsof -d cwd -Fn` call. A failed call with no output throws, because "no process" is then not known. */
export const lsofCwds =
	(run: CommandRunner = spawnCommand): CwdLister =>
	async () => {
		const out = await run(["lsof", "-d", "cwd", "-Fn"], {
			cwd: "/",
			timeoutMs: 30_000,
		});
		if (out.stdout === "" && out.code !== 0) {
			throw new Error("`lsof -d cwd -Fn` gave no answer");
		}
		return cwdPaths(out.stdout);
	};

/** True when a cwd is `dir` or inside it. */
export const holdsCwd = (dir: string, cwds: readonly string[]): boolean =>
	cwds.some((cwd) => cwd === dir || cwd.startsWith(`${dir}/`));

/** True when `tmux -S socket has-session` succeeds or a connect to the socket does. */
export const liveSocket =
	(run: CommandRunner = spawnCommand): SocketProbe =>
	async (socket) => {
		const out = await run(["tmux", "-S", socket, "has-session"], {
			cwd: "/",
			timeoutMs: 5000,
		});
		if (out.code === 0) {
			return true;
		}
		try {
			const open = await connect({
				unix: socket,
				socket: { data: () => undefined },
			});
			open.end();
			return true;
		} catch {
			return false;
		}
	};

const exists = async (path: string): Promise<boolean> =>
	(await lstat(path).catch(() => undefined)) !== undefined;

/** The `tmux.sock` files in `dir` and in its direct subfolders. */
export const socketsIn = async (dir: string): Promise<string[]> => {
	const names = await readdir(dir).catch(() => []);
	const found = await Promise.all(
		names.map(async (name): Promise<string | undefined> => {
			const path = join(dir, name);
			if (name === "tmux.sock") {
				return path;
			}
			const inner = join(path, "tmux.sock");
			return (await exists(inner)) ? inner : undefined;
		}),
	);
	return found.filter((f): f is string => f !== undefined);
};

/** True when any `tmux.sock` under `dir` answers. */
export const hasLiveSocket = async (
	dir: string,
	probe: SocketProbe,
): Promise<boolean> => {
	const sockets = await socketsIn(dir);
	return (await Promise.all(sockets.map(probe))).some(Boolean);
};
