// Upstream's recorded behaviour, replayed through the plugin's code on a real temp tree (bun test only:
// the lab has no node APIs). A case either equals upstream, or is a named divergence; nothing else passes.
import { afterAll, describe, expect, test } from "bun:test";

import { nonEmpty } from "../../plugins/claudetto-openspec/hooks/fs.ts";
import {
	ARCHIVE_FILES,
	carriedFlags,
	replayArchive,
	replayNoChange,
} from "./fixture-archive.ts";
import { FILES, load, type Rec } from "./fixture-kit.ts";
import { notReplayable, replayRecord, runnerFor } from "./fixture-replay.ts";
import { isObject, items } from "./fixture-shape.ts";
import { count, reportTally } from "./fixture-tally.ts";

afterAll(reportTally);

const loaded = (names: string[]) =>
	Promise.all(names.map(async (name) => ({ name, records: await load(name) })));

for (const { name, records } of await loaded(FILES)) {
	describe(name, () => {
		for (const rec of records) {
			const run = runnerFor(rec.kind);
			const why = notReplayable(name, rec);
			if (why !== undefined) {
				if (why !== "") {
					count(name, `excluded: ${why}`);
				}
			} else if (run === undefined) {
				count(name, "not wired");
			} else {
				test(`${rec.kind} ${rec.test}`, async () => {
					const { actual, expected } = await replayRecord(name, rec, run);
					expect(actual).toEqual(expected);
				});
			}
		}
	});
}

// An archive call is recorded as its change name and the options it was given.
const callOf = (rec: Rec) => {
	const [change, options] = items(
		isObject(rec.args) ? rec.args["args"] : undefined,
	);
	return {
		change: typeof change === "string" ? change : undefined,
		options: isObject(options) ? options : undefined,
	};
};

const archiveFiles = await loaded(ARCHIVE_FILES);
const archived = archiveFiles.flatMap(({ name, records }) =>
	records
		.filter((rec) => rec.kind === "archive.execute")
		.map((rec) => {
			const { change, options } = callOf(rec);
			return { name, rec, change, options };
		}),
);

describe("archive", () => {
	for (const { name, rec, change, options } of archived) {
		if (nonEmpty(change)) {
			test(`archive.execute ${rec.test}`, async () => {
				const { actual, expected } = await replayArchive(
					name,
					rec,
					change,
					carriedFlags(rec, options),
				);
				expect(actual).toEqual(expected);
			});
		} else {
			test(`archive.execute ${rec.test}`, async () => {
				const { actual, expected } = await replayNoChange(name, rec);
				expect(actual).toEqual(expected);
			});
		}
	}
});
