// Tests of `userEdits` in `plugins/claudetto/modules/project/domain/edits.ts`: it stops reading at `STAGE_NAMES_MAX` names.

import { expect, test } from "bun:test";
import {
	type EditPorts,
	userEdits,
} from "../../../plugins/claudetto/modules/project/domain/edits.ts";
import { STAGE_NAMES_MAX } from "../../../plugins/claudetto/modules/project/limits.ts";

const COUNT = 150;
const names = Array.from({ length: COUNT }, (_, i) => `f${i}.ts`);

test("`userEdits` stops reading files once it has `STAGE_NAMES_MAX` names, in order", async () => {
	const reads: string[] = [];
	const io: EditPorts = {
		git: async (args) => ({
			exitCode: 0,
			stdout:
				args[0] === "status" ? names.map((n) => `?? ${n}\0`).join("") : "/r\n",
		}),
		read: async (file) => {
			reads.push(file);
			return file;
		},
		ledger: async () => [],
		root: async () => "/r",
	};
	const edits = await userEdits(io);
	expect(edits).toStrictEqual(names.slice(0, STAGE_NAMES_MAX));
	expect(reads.length).toBeLessThan(COUNT / 2);
});
