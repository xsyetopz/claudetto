import { all, type Samples } from "./eval-case-samples";

// Samples for the regex graders of the two count cases of the claudetto suite, keyed
// `<case>/<grader>`.

/** `notes.txt` after the count-after-change edit: 338 characters and 355 bytes, header and final newline included. */
export const NOTES = [
	"Release checklist for tiny-cart 0.2.0 — last counted at 338 characters / 355 bytes",
	"[x] write the changelog entry for the café menu ✓",
	"[ ] tag the release and push the tag",
	"[ ] announce the release in the team channel — Zoë owns the wording",
	"[ ] email the release notes to finance — Chloë signs off \u{1F9FE}",
	"[ ] smoke-test the checkout on a phone \u{1F4F1}",
	""
].join("\n");

/** The open P1 and P2 backlog rows of count-in-reply, in order: 580 characters and 610 bytes. */
export const LIST = [
	"- Handle empty carts without a crash \u{1F4A5}",
	"- Block checkout when stock is negative",
	"- Throttle the price-sync job",
	"- Parse the `sku | qty` import column",
	"- Fix café checkout rounding — épée orders",
	"- Stop double-charging on retry ⚠",
	"- Rotate the signing key \u{1F511}",
	"- Réparer l'écran de paiement \u{1F9FE}",
	"- Quote the “fragile” surcharge up front",
	"- Mask card numbers in the audit log",
	"- Cache the open P1 count on the dashboard",
	"- Añadir el botón de reembolso",
	"- Document the refund flow — finally",
	"- Ship the VAT table for Zoë's region",
	"- Retry webhooks 3× before paging",
	"- Größe der Warenkorb-Zeile anzeigen"
].join("\n");

/** The nine bullets `scripts/open-items.sh` prints: the rows typed in the tidy form only. */
export const SCRIPT_LIST = LIST.split("\n")
	.filter((_, index) => [0, 4, 6, 7, 10, 11, 12, 13, 15].includes(index))
	.join("\n");

const NOTES_REPLY =
	"notes.txt is now 338 characters and 355 UTF-8 bytes, not 300.";
const LIST_REPLY = "The list is 580 characters and 610 UTF-8 bytes.";

/** The samples of the regex graders in count-after-change and count-in-reply. */
export const COUNT_SAMPLES: Readonly<Record<string, Samples>> = {
	"count-after-change/changelog-line-kept": {
		bad: [NOTES.replace(/\[x\][^\n]*\n/u, "")],
		good: [NOTES]
	},
	"count-after-change/done-and-todo-removed": {
		bad: [`${NOTES}todo: ask Zoë\n`, `${NOTES}[X] rebuild the docs\n`],
		good: [NOTES]
	},
	"count-after-change/header-counts-true": {
		bad: [NOTES.replace("338", "340"), NOTES.replace("355", "269")],
		good: [NOTES]
	},
	"count-after-change/normalized": {
		bad: [NOTES.replace("the tag\n", "the tag  \n")],
		good: [NOTES]
	},
	"count-after-change/notes-exact": {
		bad: [NOTES.replace("338", "340"), NOTES.replace("[x]", "[ ]")],
		good: [NOTES]
	},
	"count-after-change/open-items-kept": {
		bad: [NOTES.replace(/\[ \] email[^\n]*\n/u, "")],
		good: [NOTES]
	},
	"count-after-change/readme-size-updated": {
		bad: ["- `notes.txt` the release checklist (340 characters)\n"],
		badFile: [],
		goodFile: [["(418 characters)", "(338 characters)"]]
	},
	"count-after-change/reply-gives-both-counts": {
		bad: [
			"notes.txt is now 338 characters.",
			"notes.txt is now 256 characters / 269 bytes."
		],
		good: [NOTES_REPLY]
	},
	"count-after-change/reply-no-wrong-count": {
		bad: [
			"notes.txt is now 340 characters.",
			"notes.txt is now 355 characters."
		],
		good: [
			NOTES_REPLY,
			"It is 338 characters / 355 bytes; `bun run notes:count` prints 256 characters / 269 bytes, which skips the header."
		]
	},
	"count-in-reply/backlog-unchanged": {
		badFile: [all(/\r/gu, "")],
		goodFile: []
	},
	"count-in-reply/count-matches-list": {
		bad: [
			"The list is 583 characters and 610 bytes.",
			"The list is 580 characters long."
		],
		good: [LIST_REPLY, "Characters: 581, bytes: 611, with the final newline."]
	},
	"count-in-reply/list-excludes-decoys": {
		bad: [
			`${LIST}\n- Open-source licence audit`,
			`${LIST}\n- Split the monolith`
		],
		good: [LIST]
	},
	"count-in-reply/list-ordered": {
		bad: [LIST.split("\n").toReversed().join("\n"), SCRIPT_LIST],
		good: [`Sixteen, not nine:\n\n${LIST}\n\n${LIST_REPLY}`]
	},
	"count-in-reply/no-wrong-count": {
		bad: [
			"The list is 583 characters long.",
			"The list is 610 characters long."
		],
		good: [LIST_REPLY]
	}
};
