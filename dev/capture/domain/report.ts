import { MAX_PART_COUNTS, SPLIT_CHARS } from "../../../tools/limits.ts";
import { mapInOrder } from "../../../tools/ordered.ts";
import { countTokens } from "./count.ts";
import type {
	Block,
	Body,
	Fix,
	Message,
	Part,
	Row,
	Sizing,
	Swap,
	Tool,
	Wait,
} from "./types.ts";

const label = (block: Block | string): string => {
	if (typeof block === "string") {
		return `text: ${block.slice(0, 70)}`;
	}
	const text = block.text ?? block.content ?? block.name ?? "";
	const head = (typeof text === "string" ? text : JSON.stringify(text)).replace(
		/\s+/g,
		" ",
	);
	return `${block.type}: ${head.slice(0, 70)}`;
};

const swapAt = <T>(list: T[], at: number, next: T | null): T[] => {
	const replacement = next ? [next] : [];
	return list.flatMap((x, i) => (i === at ? replacement : [x]));
};

const asBlocks = (content: string | Block[]): Block[] =>
	typeof content === "string" ? [{ type: "text", text: content }] : content;

const SECTION =
	/^(#{1,3} \S|<[a-z_-]+>\s*$|The following |Available agent types|While auto mode)/;

const sections = (text: string): string[] => {
	const lines = text.split("\n");
	const found: string[] = [];
	let from = 0;
	lines.forEach((line, i) => {
		if (i > 0 && SECTION.test(line)) {
			found.push(lines.slice(from, i).join("\n"));
			from = i;
		}
	});
	found.push(lines.slice(from).join("\n"));
	return found;
};

const blockParts = (
	kind: string,
	block: Block,
	swap: Swap,
	removable: boolean,
): Part[] => {
	const text = typeof block.text === "string" ? block.text : null;
	if (text && text.length > SPLIT_CHARS) {
		const list = sections(text);
		if (list.length > 1) {
			return list.map((section, i) => ({
				kind,
				name: label({ type: "section", text: section }),
				chars: section.length,
				without: () =>
					swap({ ...block, text: list.filter((_, j) => j !== i).join("\n") }),
			}));
		}
	}
	if (!removable) {
		return [];
	}
	return [
		{
			kind,
			name: label(block),
			chars: JSON.stringify(block).length,
			without: () => swap(null),
		},
	];
};

export const parts = (body: Body): Part[] => {
	const list: Part[] = [];
	const system = asBlocks(body.system ?? []);
	system.forEach((block, i) => {
		const swap: Swap = (next) => ({
			...body,
			system: swapAt(system, i, next),
		});
		list.push(...blockParts("system", block, swap, true));
	});
	(body.tools ?? []).forEach((tool: Tool, i) => {
		list.push({
			kind: tool.defer_loading ? "tool (deferred)" : "tool",
			name: tool.name ?? tool.type,
			chars: JSON.stringify(tool).length,
			without: () => ({
				...body,
				tools: (body.tools ?? []).filter((_, j) => j !== i),
			}),
		});
	});
	body.messages.forEach((message: Message, m) => {
		const blocks = asBlocks(message.content);
		blocks.forEach((block, b) => {
			const swap: Swap = (next) => ({
				...body,
				messages: body.messages.map((msg, j) =>
					j === m
						? {
								...msg,
								content: swapAt(blocks, b, next),
							}
						: msg,
				),
			});
			list.push(
				...blockParts(
					`message ${m} (${message.role})`,
					block,
					swap,
					// A message needs one block, so the only block of a message is not removed.
					blocks.length > 1,
				),
			);
		});
	});
	return list;
};

const FIXES: Record<string, Fix> = {
	"no thinking": (body) => ({ ...body, thinking: undefined }),
	"system messages as user text": (body) => {
		const messages: Message[] = [];
		for (const msg of body.messages) {
			const last = messages.at(-1);
			if (msg.role !== "system") {
				messages.push({ ...msg });
			} else if (last?.role === "user") {
				last.content = [...asBlocks(last.content), ...asBlocks(msg.content)];
			} else {
				messages.push({ role: "user", content: asBlocks(msg.content) });
			}
		}
		return { ...body, messages };
	},
};

/** `body` with the fixes `names` applied one after the other. */
const applyFixes = (names: string[], body: Body): Body => {
	let out = body;
	for (const name of names) {
		out = FIXES[name]?.(out) ?? out;
	}
	return out;
};

const pause: Wait = (ms) => new Promise((done) => setTimeout(done, ms));

const fixesFor = async (
	upstream: string,
	body: Body,
	headers: Record<string, string>,
	query: string,
	wait: Wait,
): Promise<{ used: string[]; full: number }> => {
	const attempt = async (
		names: (string | null)[],
		used: string[],
		errors: string[],
	): Promise<{ used: string[]; full: number }> => {
		const [name, ...rest] = names;
		if (name === undefined) {
			throw new Error(errors.join("\n"));
		}
		const now = name ? [...used, name] : used;
		try {
			return {
				used: now,
				full: await countTokens(
					upstream,
					applyFixes(now, body),
					headers,
					query,
					wait,
				),
			};
		} catch (e) {
			return attempt(rest, now, [...errors, String(e)]);
		}
	};
	return attempt([null, ...Object.keys(FIXES)], [], []);
};

export const sizeRequest = async (
	upstream: string,
	body: Body,
	headers: Record<string, string>,
	query: string,
	wait: Wait = pause,
): Promise<Sizing> => {
	const { used, full } = await fixesFor(upstream, body, headers, query, wait);
	const fix = (b: Body): Body => applyFixes(used, b);
	const rows = await mapInOrder(
		parts(body).entries(),
		async ([i, part]): Promise<Row> => {
			const row = { kind: part.kind, name: part.name, chars: part.chars };
			if (i >= MAX_PART_COUNTS) {
				return {
					...row,
					tokens: null,
					note: `not counted: past the bound of ${MAX_PART_COUNTS} parts`,
				};
			}
			try {
				const without = await countTokens(
					upstream,
					fix(part.without()),
					headers,
					query,
					wait,
				);
				return { ...row, tokens: full - without, note: null };
			} catch (e) {
				return { ...row, tokens: null, note: `count failed: ${String(e)}` };
			}
		},
	);
	let sum = 0;
	for (const r of rows) {
		sum += r.tokens ?? 0;
	}
	return {
		model: body.model,
		fixes: used,
		full,
		parts: sum,
		rest: full - sum,
		rows,
	};
};

export const sizingLines = (n: string, s: Sizing): string[] => {
	const uncounted = s.rows.filter((r) => r.tokens === null).length;
	const header = `\nrequest ${n}: ${s.full} tokens by count_tokens, parts ${s.parts}, rest ${s.rest}`;
	return [
		uncounted ? `${header}, ${uncounted} parts not counted` : header,
		...[...s.rows]
			.sort((a, b) => (b.tokens ?? -1) - (a.tokens ?? -1))
			.map(
				(r) =>
					`${(r.tokens === null ? "?" : String(r.tokens)).padStart(6)}  ${String(r.chars).padStart(6)}c  ${r.kind}  ${r.name}${r.note ? `  (${r.note})` : ""}`,
			),
	];
};
