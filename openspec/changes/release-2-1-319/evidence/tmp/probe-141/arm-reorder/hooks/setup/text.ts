export const STATUSLINE_DESCRIPTION =
	"Write claudetto's status line, with no model call";

const STOCK_TAIL = 'the prompt "';

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
