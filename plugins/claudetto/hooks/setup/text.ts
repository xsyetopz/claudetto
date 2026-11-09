export const STATUSLINE_DESCRIPTION =
	"Write claudetto's status line, with no model call";

export const SETUP_ADVICE = (
	question: string,
	options: readonly string[],
): string =>
	`A person is running the setup of claudetto, a Claude Code plugin, and is asked the question below. Recommend one option for a typical developer, and give the reason in one plain sentence a non-expert can follow, naming what the option changes for them. Judge from what the question shows about this person's settings, not from general praise of a feature, and when the person already set a value, weigh keeping it. When the question does not show enough to choose, set "pick" to "". Answer with JSON only: {"pick":"<one option, copied exactly>","why":"<one sentence>"}\n\nOptions: ${JSON.stringify(options)}\n\nQuestion:\n${question}`;

export const recommended = (pick: string, why: string): string =>
	`\n\nRecommended: ${pick}. ${why}`;

const STOCK_TAIL ='the prompt "';

/** The request ends the stock text in quotes. */
const requestOf = (stock: string): string => {
	const at = stock.lastIndexOf(STOCK_TAIL);
	if (at === -1) {
		return stock;
	}
	const tail = stock.slice(at + STOCK_TAIL.length);
	return tail.endsWith('"') ? tail.slice(0, -1) : tail;
};

/** Replaces the built-in `/statusline` prompt, so the main model edits the setting itself. */
export const statuslineEdit = (stock: string, file: string): string =>
	`Set the user's status line to: ${requestOf(stock)}
Read @${file}. Write \`statusLine\` as { "type": "command", "command": "<shell command>" }, where the command reads the session JSON on stdin and prints one line; keep every other key. Run the command once on a sample JSON with Bash before you write it.`;
