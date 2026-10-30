// The findings of a file tool: a write to the system, and a read of a secret file or a glob for one.

import type { Facts } from "../gate.ts";
import { globsSecret, pathOf } from "../paths.ts";
import {
	denySecret,
	type Finding,
	secretWord,
	systemWrite,
	textOf,
} from "./finding.ts";
import { protectedFinding } from "./protected.ts";

/** The findings of a file tool call. `Edit`, `Write`, and `NotebookEdit` give a system write or a protected-file finding; any other tool gives at most one deny, when a path or its `glob` (`Grep`) or `pattern` names a secret. */
export const fileFindings = (
	tool: string,
	input: Record<string, unknown>,
	f: Facts,
): Finding[] => {
	const text = (key: string) => textOf(input, key);
	const file = text("file_path") || text("notebook_path");
	if (tool === "Edit" || tool === "Write" || tool === "NotebookEdit") {
		const path = pathOf(f.cwd, file, f);
		return [systemWrite(path), protectedFinding(path, input)].filter(
			(x) => x !== undefined,
		);
	}
	const named = [file, text("path")].filter(
		(w) => w !== "" && secretWord(f.cwd, w, f),
	);
	const globs = [text(tool === "Grep" ? "glob" : "pattern")].filter((w) =>
		globsSecret(f.cwd, w, f),
	);
	const word = [...named, ...globs][0];
	return word === undefined ? [] : [denySecret(word)];
};
