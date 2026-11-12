import { judge } from "./rules.ts";

export const NONE = (_file: string) => false;

export const withFiles =
	(...files: string[]) =>
	(file: string) =>
		files.includes(file);

export const decision = (command: string, has = NONE) =>
	judge(command, has)?.decision;
