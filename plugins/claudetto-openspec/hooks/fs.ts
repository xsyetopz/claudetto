import type { EngineInterface } from "claude-code";

// The slice of `$.fs` the workflow uses; a hooks module has no `node:fs`.
export type Fs = Pick<
	EngineInterface["fs"],
	"write" | "list" | "exists" | "stat"
> & { read: (path: string) => Promise<string>; log: Log };

export type Log = (message: string) => void;

export const join = (...parts: string[]) =>
	parts.join("/").replaceAll("//", "/");

export const dirname = (path: string) => path.slice(0, path.lastIndexOf("/"));

export const within = (root: string, file: string) =>
	file === root || file.startsWith(`${root}/`);

export const nonEmpty = (value: string | undefined): value is string =>
	value !== undefined && value !== "";

export const safeList = async (fs: Fs, dir: string) => {
	try {
		return await fs.list(dir);
	} catch (error) {
		fs.log(`The directory ${dir} was not listed (${String(error)})`);
		return [];
	}
};

export const statOf = async (fs: Fs, path: string) => {
	let info: Awaited<ReturnType<Fs["stat"]>> | undefined;
	try {
		info = await fs.stat(path);
	} catch (error) {
		fs.log(`The path ${path} was not read for its stat (${String(error)})`);
		info = undefined;
	}
	return info;
};
