import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CLASSIFIER_ARMS } from "../../classifier/arms.ts";
import { CLASSIFIER_CASES } from "../../classifier/cases.ts";
import { runClassifierSession } from "../../classifier/session.ts";
import { ok, stubRunner } from "../stub.ts";

const [ROW] = CLASSIFIER_CASES;
const [ARM] = CLASSIFIER_ARMS;
if (ROW === undefined || ARM === undefined) {
	throw new Error("the case and arm lists are empty");
}
const SESSION = { key: ROW.key, arm: ARM, run: 1 };

let parent = "";

afterEach(async () => {
	await rm(parent, { recursive: true, force: true });
});

const depsWith = async (run: ReturnType<typeof stubRunner>["run"]) => {
	parent = await mkdtemp(join(tmpdir(), "evals-classifier-"));
	return {
		run,
		pluginDir: "/plugin",
		// Never reached: the stub runner starts no session, so no request is forwarded.
		upstream: "http://127.0.0.1:1",
		tempPrefix: join(parent, "classifier-"),
	};
};

describe("`runClassifierSession` scratch root", () => {
	test("is gone after a session", async () => {
		const deps = await depsWith(stubRunner().run);

		const outcome = await runClassifierSession(deps, ROW, SESSION);

		expect(outcome.session).toEqual(SESSION);
		expect(await readdir(parent)).toEqual([]);
	});

	test("is gone when the runner throws, and the error reaches the caller", async () => {
		let calls = 0;
		const deps = await depsWith(() => {
			calls += 1;
			// The first calls seed the repository; the session is the one that breaks.
			return calls > 5
				? Promise.reject(new Error("the runner broke"))
				: Promise.resolve(ok());
		});

		const failed = runClassifierSession(deps, ROW, SESSION);

		await expect(failed).rejects.toThrow("the runner broke");
		expect(await readdir(parent)).toEqual([]);
	});
});
