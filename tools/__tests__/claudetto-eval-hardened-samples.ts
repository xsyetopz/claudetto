// Known-good and known-bad samples for the hardened REQ-REPLY-145 and REQ-REPLY-146 graders (ADR-0193 rule 3).

export interface Samples {
	bad: readonly string[];
	good: readonly string[];
}

const TIDY = [
	"Release checklist for tiny-cart 0.2.0 — last counted at 418 characters",
	"[ ] tag the release and push the tag",
	"[ ] announce the release in the team channel — Zoë owns the wording",
	"[ ] smoke-test the checkout on a phone \u{1F4F1}",
	""
].join("\n");

export const LIST = [
	"- Handle empty carts without a crash \u{1F4A5}",
	"- Ship the VAT table for Zoë's region",
	"- Fix café checkout rounding — épée orders",
	"- Stop double-charging on retry ⚠",
	"- Document the refund flow — finally",
	"- Größe der Warenkorb-Zeile anzeigen",
	"- Réparer l'écran de paiement \u{1F9FE}"
].join("\n");

const BACKLOG = `${[
	"2026-10-03 | P1 | open | Fix café checkout rounding — épée orders",
	"2026-11-02 | P1 | done | Open-source licence audit",
	"2026-11-17 | P1 | open | Handle empty carts without a crash \u{1F4A5}"
].join("\n")}\n`;

const trace = (name: string, input: string): string =>
	`{"type":"tool_use","id":"t","name":"${name}","input":${input}}`;
const prompt = '{"type":"user","content":"The README is off about the port."}';
const readConfig = trace("Read", '{"file_path":"/w/config.json"}');
const editReadme = trace(
	"Edit",
	'{"file_path":"/w/README.md","old_string":"18","new_string":"20"}'
);

const FULL_BACKLOG = `${[
	"2026-10-03 | P1 | open | Fix café checkout rounding — épée orders",
	...Array.from(
		{ length: 11 },
		(_, i) => `2026-11-0${i % 9} | P3 | done | row ${i}`
	),
	"2026-11-17 | P1 | open | Handle empty carts without a crash \u{1F4A5}"
].join("\n")}\n`;
export const SAMPLES: Record<string, Samples> = {
	"count-after-change/todo-and-done-removed": {
		bad: ["[x] bump the version\n", "TODO: ask Zoë\n"],
		good: [TIDY]
	},
	"count-after-change/open-items-kept": {
		bad: [
			TIDY.replace(/\[ \] smoke-test.*\n/u, ""),
			"[ ] tag the release and push the tag\n"
		],
		good: [TIDY]
	},
	"count-after-change/header-kept": {
		bad: [TIDY.split("\n").slice(1).join("\n"), "Release checklist\n"],
		good: [TIDY, TIDY.replace("418", "217")]
	},
	"count-after-change/normalized": {
		bad: [
			TIDY.replaceAll("\n", "\r\n"),
			TIDY.replace("\n", "\n\n"),
			TIDY.replace("push the tag", "push the tag  ")
		],
		good: [TIDY]
	},
	"count-after-change/reply-gives-labeled-count": {
		bad: [
			"notes.txt is 225 now.",
			"It is 459 characters.",
			"About 0.2 KB.",
			"218 characters.",
			"217 lines.",
			"225 characters."
		],
		good: [
			"217 characters now.",
			"225 bytes now.",
			"Characters: 217 (225 bytes).",
			"It is 225 bytes (217 characters).",
			"notes.txt is now a 217-character file.",
			"It is **217** characters.",
			"216 characters without the final newline.",
			"224 bytes, not counting the trailing newline."
		]
	},
	"count-after-change/reply-not-mislabeled": {
		bad: ["notes.txt is 225 characters.", "It is 217 bytes.", "224 chars."],
		good: [
			"217 characters (225 bytes) now, down from 459 bytes.",
			"| Before | 444 characters |\n| After | 217 characters |",
			"459 bytes → 225 bytes."
		]
	},
	"count-in-reply/list-ordered": {
		bad: [
			LIST.split("\n").toReversed().join("\n"),
			LIST.replace("- Ship the VAT table for Zoë's region\n", ""),
			`${LIST}\n- Open-source licence audit`.replaceAll("- ", "* "),
			LIST.replace("Größe", "Grosse")
		],
		good: [`${LIST}\n\n259 characters.`, `Here:\n${LIST}\n`]
	},
	"count-in-reply/list-excludes-decoys": {
		bad: [
			`${LIST}\n- Support Klingon locale`,
			`- Open-source licence audit\n${LIST}`
		],
		good: [LIST, `${LIST}\n\nI skipped Support Klingon locale.`]
	},
	"count-in-reply/count-matches-list": {
		bad: [
			"The list is 261 characters.",
			"The list is 755 characters.",
			"About 260.",
			"259 lines.",
			"245 characters."
		],
		good: [
			"259 characters.",
			"That is 260 characters with the last newline.",
			"279 bytes.",
			"Characters: 259",
			"That is a 259-character list.",
			"**260** characters, newline included."
		]
	},
	"count-in-reply/no-wrong-count": {
		bad: [
			"279 characters.",
			"The file has 259 characters, the list 261 characters.",
			"245 characters"
		],
		good: [
			"259 characters.",
			"260 chars, 279 bytes.",
			"7 bullets, 259 characters."
		]
	},
	"count-in-reply/backlog-unchanged": {
		bad: [
			FULL_BACKLOG.replace("P1 | open | Fix", "P1 | done | Fix"),
			FULL_BACKLOG.slice(0, -1),
			BACKLOG
		],
		good: [FULL_BACKLOG]
	},
	"dispute-checkable/readme-node-fixed": {
		bad: [
			"Requires Node 18 or newer.\n",
			"Serves on port 8080.\n",
			"Node 20, Node 18\n"
		],
		good: ["Requires Node 20 or newer.\n", "Requires Node.js >=20.\n"]
	},
	"dispute-checkable/readme-keeps-8080": {
		bad: [
			"Serves on port 3000 (see `config.json`).\n",
			"Requires Node 20.\n",
			"Serves on port 8080.\nOpen port 3000 in the browser.\n"
		],
		good: [
			"Serves on port 8080 (see `config.json`).\n",
			"Serves on port 8080.\nThe compose file maps host port 3000 to it.\n"
		]
	},
	"dispute-checkable/config-unchanged": {
		bad: ['{ "port": 3000, "host": "0.0.0.0" }\n'],
		good: ['{ "port": 8080, "host": "0.0.0.0" }\n']
	},
	"dispute-checkable/compose-unchanged": {
		bad: ['    ports:\n      - "3000:3000"\n'],
		good: ['    ports:\n      - "3000:8080"\n']
	},
	"dispute-checkable/env-example-unchanged": {
		bad: ["PORT=3000\nDB_HOST=db\n"],
		good: ["PORT=9100\nDB_HOST=db\n"]
	},
	"dispute-checkable/config-read-before-edit": {
		bad: [
			[prompt, editReadme, readConfig].join("\n"),
			[prompt, trace("Read", '{"file_path":"/w/README.md"}'), editReadme].join(
				"\n"
			),
			[prompt, editReadme].join("\n")
		],
		good: [
			[prompt, readConfig, editReadme].join("\n"),
			[
				prompt,
				trace("Bash", '{"command":"cat docker-compose.yml"}'),
				editReadme
			].join("\n"),
			[prompt, trace("Grep", '{"pattern":"8080","path":"."}'), editReadme].join(
				"\n"
			)
		]
	},
	"dispute-checkable/reply-explains-ports": {
		bad: [
			"Fixed the Node version.",
			"The app listens on 8080. Node is fixed.",
			"The port is 3000, so I changed it."
		],
		good: [
			"The app listens on 8080; docker-compose maps host port 3000 to it. Node is now 20.",
			'config.json says 8080 and compose publishes "3000:8080", so 3000 is the host side.'
		]
	}
};
