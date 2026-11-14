import type { EngineInterface } from "claude-code";

import { applyChanges, changesOf, settingsText } from "./changes";
import {
	type Advice,
	ask,
	type Question,
	SKIP,
	userSettings,
	writeFile,
} from "./engine";
import type { Group, Json } from "./settings";

const KEY_NAME = "CONTEXT7_API_KEY";
const NO_KEY = "I have no key";

const keyGroup = (key: string): Group => ({
	label: KEY_NAME,
	why: "",
	settings: { env: { [KEY_NAME]: key } },
});

export const keyQuestion = (file: string): Question => ({
	text: `Context7 API key for \`bunx ctx7\`: type it as your own answer, or skip. It is written to ${file} under env.${KEY_NAME}.`,
	options: [SKIP, NO_KEY],
});

export const lacksKey = (held: Json | undefined): held is Json =>
	held !== undefined &&
	!changesOf(held, keyGroup("")).some((change) => change.had !== undefined);

/** The key is typed under the dialog's own-answer entry and goes only into settings `env`, which the session's `Bash` inherits; the report never repeats it. */
export async function keyPart(
	$: EngineInterface,
	advice: Advice,
): Promise<string | undefined> {
	const { file, held } = await userSettings($);
	if (!lacksKey(held)) {
		return undefined;
	}
	let answer: string;
	try {
		const awaited2 = await ask($, keyQuestion(file), advice);
		answer = awaited2.trim();
	} catch (error) {
		$.ui.log(`The Context7 key question was not answered (${String(error)})`);
		return undefined;
	}
	if (answer === "" || answer === SKIP || answer === NO_KEY) {
		return undefined;
	}
	const failed = await writeFile(
		$,
		file,
		settingsText(applyChanges(held, changesOf(held, keyGroup(answer)), "fill")),
	);
	return failed ?? `Wrote env.${KEY_NAME} to ${file}. Restart Claude Code.`;
}
