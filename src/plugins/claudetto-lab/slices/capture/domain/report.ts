import { MAX_PART_COUNTS, SPLIT_CHARS } from "../limits.ts";
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
  if (typeof block === "string") return `text: ${block.slice(0, 70)}`;
  const text = block.text ?? block.content ?? block.name ?? "";
  const head = (typeof text === "string" ? text : JSON.stringify(text)).replace(
    /\s+/g,
    " ",
  );
  return `${block.type}: ${head.slice(0, 70)}`;
};

const swapAt = <T>(list: T[], at: number, next: T | null): T[] =>
  list.flatMap((x, i) => (i !== at ? [x] : next ? [next] : []));

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
  if (!removable) return [];
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
        tools: (body.tools as Tool[]).filter((_, j) => j !== i),
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
      if (msg.role !== "system") messages.push({ ...msg });
      else if (last?.role === "user")
        last.content = [...asBlocks(last.content), ...asBlocks(msg.content)];
      else messages.push({ role: "user", content: asBlocks(msg.content) });
    }
    return { ...body, messages };
  },
};

const pause: Wait = (ms) => new Promise((done) => setTimeout(done, ms));

const fixesFor = async (
  upstream: string,
  body: Body,
  headers: Record<string, string>,
  query: string,
  wait: Wait,
): Promise<{ used: string[]; full: number }> => {
  const used: string[] = [];
  const errors: string[] = [];
  for (const name of [null, ...Object.keys(FIXES)]) {
    if (name) used.push(name);
    const fixed = used.reduce((b, f) => (FIXES[f] as Fix)(b), body);
    try {
      return {
        used,
        full: await countTokens(upstream, fixed, headers, query, wait),
      };
    } catch (e) {
      errors.push(String(e));
    }
  }
  throw new Error(errors.join("\n"));
};

export const sizeRequest = async (
  upstream: string,
  body: Body,
  headers: Record<string, string>,
  query: string,
  wait: Wait = pause,
): Promise<Sizing> => {
  const { used, full } = await fixesFor(upstream, body, headers, query, wait);
  const fix = (b: Body): Body => used.reduce((x, f) => (FIXES[f] as Fix)(x), b);
  const rows: Row[] = [];
  for (const [i, part] of parts(body).entries()) {
    const row = { kind: part.kind, name: part.name, chars: part.chars };
    if (i >= MAX_PART_COUNTS) {
      rows.push({
        ...row,
        tokens: null,
        note: `not counted: past the bound of ${MAX_PART_COUNTS} parts`,
      });
      continue;
    }
    try {
      const without = await countTokens(
        upstream,
        fix(part.without()),
        headers,
        query,
        wait,
      );
      rows.push({ ...row, tokens: full - without, note: null });
    } catch (e) {
      rows.push({ ...row, tokens: null, note: `count failed: ${String(e)}` });
    }
  }
  const sum = rows.reduce((s, r) => s + (r.tokens ?? 0), 0);
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
