import { join, resolve } from "node:path";
import { type Fixture, gradeHeldOut, loadFixtures, parseSet } from "./fixture.ts";
import { mine, split } from "./mine.ts";

// Two earlier turns give a short ask such as "Keep digging." the work it refers to.
const KEEP = 4;
// The held-out set only confirms a gain the tuning set already showed, so the tuning set keeps the bulk.
// A fifth of the 54 sessions mined on 2026-11-05 gives about 70 cases, a 95% Wilson interval of about ±11 points,
// narrower than the 47-point gap between the baseline arms in `settings-review.txt`.
const HELD_SHARE = 0.2;

export const FIXTURE_HELP = `claudekit fixture <command> ...

A set is a JSON file: { name, heldOut, fixtures: [{ id, prefix, reply, userReply, labels, source }] }.
source is a session path:line or "written".

  check SET           validate every fixture; print the count and the held-out mark
  mine OUT SESSION... pair each assistant turn in the session transcripts with the user's next typed
                      message, the earlier ${KEEP} messages as the prefix; write the set to OUT
  split OUT HELD SESSION...
                      mine as above, send a random ${HELD_SHARE * 100}% of whole sessions to HELD/held-out.json by
                      the seed kept in HELD/seed (written once), the rest to OUT; print only counts
  grade SET GRADER    grade a held-out set in a child process with GRADER, a module whose default
                      export is a grader of fixtures; print only { n, pass, byLabel }
`;

export const fixtureCommand = async (argv: string[]): Promise<string> => {
	const [command, set, grader] = argv;
	if (command === undefined || command === "--help") {
		return FIXTURE_HELP;
	}
	if (set === undefined) {
		throw new Error("SET: missing; see claudekit fixture --help");
	}
	if (command === "mine" || command === "split") {
		const held = command === "split" ? grader : undefined;
		const sessions = argv.slice(command === "split" ? 3 : 2);
		if (sessions.length === 0) {
			throw new Error("SESSION: missing; see claudekit fixture --help");
		}
		const fixtures = (await Promise.all(sessions.map(async (s) => mine(s, await Bun.file(s).text(), KEEP)))).flat();
		const counted = `${fixtures.length} fixtures from ${sessions.length} sessions`;
		if (held === undefined) {
			await writeSet(set, "mined", false, fixtures);
			return `${counted} -> ${set}`;
		}
		const seedFile = Bun.file(join(held, "seed"));
		const seed = (await seedFile.exists()) ? await seedFile.text() : crypto.randomUUID();
		await Bun.write(seedFile, seed);
		const parts = split(fixtures, seed, HELD_SHARE);
		await writeSet(set, "tuning", false, parts.tuning);
		await writeSet(join(held, "held-out.json"), "held-out", true, parts.heldOut);
		return `${counted}: ${parts.tuning.length} tuning -> ${set}, ${parts.heldOut.length} held out`;
	}
	switch (command) {
		case "check": {
			const s = await loadFixtures(set);
			return `${s.name}: ${s.fixtures.length} fixtures, held-out ${s.heldOut}`;
		}
		case "grade":
			if (grader === undefined) {
				throw new Error("GRADER: missing; see claudekit fixture --help");
			}
			return JSON.stringify(await gradeHeldOut(resolve(set), resolve(grader)));
		default:
			throw new Error(`fixture command ${JSON.stringify(command)}: unknown; see claudekit fixture --help`);
	}
};

const writeSet = (path: string, name: string, heldOut: boolean, fixtures: Fixture[]) =>
	Bun.write(path, JSON.stringify(parseSet({ name, heldOut, fixtures }), null, "\t"));
