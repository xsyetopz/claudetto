import type { EngineInterface } from "claude-code";

// The slice of `$.fs` the workflow uses; a hooks module has no `node:fs`.
export type Fs = Pick<
	EngineInterface["fs"],
	"write" | "list" | "exists" | "stat"
> & { read: (path: string) => Promise<string> };

export const join = (...parts: string[]) =>
	parts.join("/").replaceAll("//", "/");

export const dirname = (path: string) => path.slice(0, path.lastIndexOf("/"));

export const within = (root: string, file: string) =>
	file === root || file.startsWith(`${root}/`);

export const statOf = (fs: Fs, path: string) =>
	fs.stat(path).catch(() => {});
