import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import {
	bodyOf,
	haikuFailed,
	jevAnswers,
	KEY,
	noul,
} from "../../decider/decider.mock";
import { HELD_REGISTER, SHIPPED_REGISTER } from "../../decider/questions";
import { scanner } from "../../secrets.mock";
import { REGISTER_BLOCK } from "../../texts";
import { user } from "./verify.mock";

const SHIPPED = Object.keys(SHIPPED_REGISTER.questions);
const HELD = Object.keys(HELD_REGISTER.questions);

const namesOf = (body: Record<string, unknown>): string[] => {
	const questions = body["questions"];
	return typeof questions === "object" && questions !== null
		? Object.keys(questions)
		: [];
};

const lab = (on: On, yes: readonly string[]) => {
	const bodies: Record<string, unknown>[] = [];
	scanner(on);
	mock.env(on, { TYPESAFE_API_KEY: KEY });
	mock.clock(on);
	on("classic.Stop", () => ({}));
	on("ui.log", () => ({ value: undefined }));
	on("session.messages", () => ({ value: [user("Did the build pass?")] }));
	on("model.complete", () => ({
		value: haikuFailed("aborted"),
	}));
	on("http.fetch", (_$, e) => {
		const body = bodyOf(e);
		bodies.push(body);
		return {
			value: jevAnswers(
				Object.fromEntries(
					namesOf(body).map((name) => [
						name,
						noul(yes.includes(name) ? 0.95 : 0.05),
					]),
				),
			),
		};
	});
	return bodies;
};

const stop = ($: Engine, active = false) =>
	$.classic.Stop({
		stop_hook_active: active,
		last_assistant_message: "Sorry, the build failed.",
		background_tasks: [],
	});

test("the Stop check asks the five shipped questions and none of the four held", async ($: Engine, on: On) => {
	const bodies = lab(on, []);
	await stop($);
	expect(bodies.flatMap((b) => namesOf(b)).toSorted()).toEqual(
		SHIPPED.toSorted(),
	);
	expect(SHIPPED).toHaveLength(5);
	expect(HELD).toHaveLength(4);
});

for (const name of SHIPPED) {
	test(`a yes to ${name} blocks the reply once, with the fix`, async ($: Engine, on: On) => {
		lab(on, [name]);
		const first = await stop($);
		expect(first.block).toBe(REGISTER_BLOCK);
		expect(first.block).toContain("the fact");
		expect(first.block).toContain("next step");
		const second = await stop($, true);
		expect(second.block).toBeUndefined();
	});
}

test("a yes to each held question does not block", async ($: Engine, on: On) => {
	lab(on, HELD);
	const out = await stop($);
	expect(out.block).toBeUndefined();
});
