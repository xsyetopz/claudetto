// The classifier stage of the gate: Jev first, then `CLASSIFIER_MODEL` at the `high` effort. A fault of either stage leaves the `ask` to a person.
// `classic.PermissionRequest` of the same call reads the verdict that `tool.check` got, so one call costs one classification.
// `mod.ts` gives each read as a closure over `$`, because the mod runtime follows `$` into no imported arrow function.

import type { EngineInterface } from "claude-code";
import { pluginOptions } from "../../../kernel/options.ts";
import { jevBody, noulOf, postJev } from "../../jev/domain/jev.ts";
import { jevKey } from "../../jev/domain/request.ts";
import {
	afterVerdict,
	answerOf,
	type Denials,
	inputText,
	isTripped,
	NO_DENIALS,
	requestsOf,
} from "../domain/classifier.ts";
import type { Verdict } from "../domain/gate.ts";
import {
	CLASSIFIER_MAX_TOKENS,
	CLASSIFIER_MODEL,
	CLASSIFIER_TIMEOUT_MS,
	JEV_YES_MIN,
	SETTLED_KEPT,
	SETTLED_MS,
} from "../limits.ts";
import {
	CLASSIFIER_ALLOW,
	CLASSIFIER_DENY,
	CLASSIFIER_PROMPT,
	CLASSIFIER_SYSTEM,
	JEV_ALLOW,
	JEV_QUESTION,
	JEV_STATE,
	NO_REQUESTS,
} from "../prompts.ts";

/** A verdict of the classifier stage, with the stage that gave it. */
export type Settled = Verdict & { decider: "jev" | "classifier" };

/** The reads and calls of the stage. `jevKey` reads the env var `TYPESAFE_API_KEY`. */
export interface ClassifierIo {
	readonly session: () => Promise<string>;
	readonly now: () => Promise<number>;
	readonly messages: () => Promise<Parameters<typeof requestsOf>[0]>;
	readonly jevKey: () => Promise<string | undefined>;
	readonly fetch: EngineInterface["http"]["fetch"];
	readonly sleep: EngineInterface["clock"]["sleep"];
	readonly complete: EngineInterface["model"]["complete"];
}

/** The call that the gate stopped, and the `ask` of the gate. */
export interface Stopped {
	readonly tool: string;
	readonly input: unknown;
	readonly own: Verdict;
}

/** True unless the `classifier` option is `off`, which turns off the model stage only: Jev follows the `decide` option. A missing value is on, as the default of the manifest. */
export const isClassifierOn = (
	options: Readonly<Record<string, unknown>>,
): boolean => options["classifier"] !== "off";

const denials = new Map<string, Denials>();
const settled = new Map<
	string,
	{ at: number; verdict: Promise<Settled | undefined> }
>();

const requestsFor = async (io: ClassifierIo): Promise<string> => {
	try {
		return requestsOf(await io.messages());
	} catch {
		return NO_REQUESTS;
	}
};

/** `allow` when Jev is sure that the call is safe, else `undefined`. */
const askJev = async (
	io: ClassifierIo,
	state: string,
): Promise<Settled | undefined> => {
	// The exported `TYPESAFE_API_KEY` of 0.3.0-alpha.1 stays a fallback.
	const key = await jevKey(pluginOptions(), io.jevKey);
	if (!key) {
		return undefined;
	}
	const answers = await postJev(
		key,
		jevBody(state, { q: { type: "noul", instructions: JEV_QUESTION } }),
		{ fetch: io.fetch },
		{ sleep: io.sleep },
	).catch(() => undefined);
	const p = noulOf(answers, "q");
	return p !== undefined && p >= JEV_YES_MIN
		? {
				decision: "allow",
				reason: JEV_ALLOW({ p: p.toFixed(2) }),
				decider: "jev",
			}
		: undefined;
};

/** The verdict of `CLASSIFIER_MODEL`, or `undefined` when the call fails or its answer has no single `<block>` tag. */
const askModel = async (
	io: ClassifierIo,
	prompt: string,
): Promise<Settled | undefined> => {
	const reply = await io
		.complete({
			model: CLASSIFIER_MODEL,
			system: CLASSIFIER_SYSTEM,
			prompt,
			effort: "high",
			maxTokens: CLASSIFIER_MAX_TOKENS,
			timeoutMs: CLASSIFIER_TIMEOUT_MS,
		})
		.catch(() => undefined);
	const answer = reply?.isAnswered ? answerOf(reply.text) : undefined;
	if (answer === undefined) {
		return undefined;
	}
	return answer.block
		? {
				decision: "deny",
				reason: CLASSIFIER_DENY({ reason: answer.reason }),
				decider: "classifier",
			}
		: {
				decision: "allow",
				reason: CLASSIFIER_ALLOW({ reason: answer.reason }),
				decider: "classifier",
			};
};

const stepOf = (
	verdict: Settled | undefined,
): Parameters<typeof afterVerdict>[1] => {
	if (verdict === undefined) {
		return "person";
	}
	return verdict.decision === "deny" ? "classifier-deny" : "allow";
};

const classify = async (
	io: ClassifierIo,
	session: string,
	{ tool, input, own }: Stopped,
): Promise<Settled | undefined> => {
	const held = denials.get(session) ?? NO_DENIALS;
	if (isTripped(held)) {
		denials.set(session, afterVerdict(held, "person"));
		return undefined;
	}
	const facts = {
		tool,
		input: inputText(input),
		reasons: own.reason ?? "",
		requests: await requestsFor(io),
	};
	const verdict =
		(await askJev(io, JEV_STATE(facts))) ??
		(isClassifierOn(pluginOptions())
			? await askModel(io, CLASSIFIER_PROMPT(facts))
			: undefined);
	denials.set(session, afterVerdict(held, stepOf(verdict)));
	return verdict;
};

/** The verdict of the classifier stage for an `ask` of the gate, or `undefined` for a person, also on a fault. `classic.PermissionRequest` of the same call, which comes within `SETTLED_MS`, reads the same verdict. */
export const settle = async (
	io: ClassifierIo,
	call: Stopped,
): Promise<Settled | undefined> => {
	try {
		const [session, now] = await Promise.all([io.session(), io.now()]);
		const key = `${session}\0${call.tool}\0${inputText(call.input)}`;
		const held = settled.get(key);
		if (held && now - held.at < SETTLED_MS) {
			return await held.verdict;
		}
		const verdict = classify(io, session, call);
		settled.delete(key);
		settled.set(key, { at: now, verdict });
		if (settled.size > SETTLED_KEPT) {
			settled.delete(settled.keys().next().value ?? "");
		}
		return await verdict;
	} catch {
		return undefined;
	}
};
