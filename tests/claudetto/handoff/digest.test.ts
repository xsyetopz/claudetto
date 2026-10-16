// The digest of the messages in the prompt of the handoff completion when there is nothing to fork (design D3).
// The values are those of the retention fixture of `handoff-retention-301.md`.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import {
  digestPrompt,
  keptLines,
  resultShare,
} from "../../../plugins/claudetto/slices/handoff/domain/digest.ts";
import { DIGEST_TOKENS_MAX } from "../../../plugins/claudetto/slices/handoff/limits.ts";
import { RULES } from "../../../plugins/claudetto/slices/handoff/prompts.ts";

/** A `Read` result of `count` lines in the `cat -n` form, with a labeled line at line 300. */
const readText = (count: number): string =>
  Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const text = n === 300 ? "KEY-1: cobalt-otter-17" : "tango zulu quartz";
    return `${String(n).padStart(6)}→${text}`;
  }).join("\n");

/** A session with one user message and one assistant message with a `Read` call whose result is `text`. */
const session = (text: string): SessionMessage[] => [
  { role: "user", text: "Read a.txt.", toolUses: [] },
  {
    role: "assistant",
    text: "",
    toolUses: [
      {
        tool_use_id: "t1",
        tool: "Read",
        input: { file_path: "a.txt" },
        text,
      },
    ],
  },
];

test("each handoff prompt asks to leave out the notices of plugins and hooks", () => {
  expect(RULES).toContain("Write only about the task of the user.");
  expect(RULES).toContain("is not part of the task, so do not copy it");
});

test("each handoff prompt asks to copy the exact text of each error", () => {
  expect(RULES).toContain(
    "For each tool call that gave an error, copy the exact error text in backticks.",
  );
});

test("a digest that fits keeps each result whole", () => {
  const prompt = digestPrompt(session(readText(600))) ?? "";
  expect(prompt).toContain("User: Read a.txt.");
  expect(prompt).toContain('Call: Read {"file_path":"a.txt"}');
  expect(prompt).toContain("   600→tango zulu quartz");
  expect(prompt).toContain(RULES);
});

test("a digest that does not fit fills its room with the start and the end of each result, and keeps each labeled line", () => {
  const text = readText(30_000).replace(
    " 15000→tango zulu quartz",
    " 15000→port: 8080",
  );
  expect(text.length / 4).toBeGreaterThan(DIGEST_TOKENS_MAX);
  const prompt = digestPrompt(session(text)) ?? "";
  expect(prompt.length / 4).toBeGreaterThan(DIGEST_TOKENS_MAX * 0.9);
  expect(prompt.length / 4).toBeLessThan(DIGEST_TOKENS_MAX * 1.1);
  for (const line of [
    "     1→tango zulu quartz",
    "     2→tango zulu quartz",
    "   300→KEY-1: cobalt-otter-17",
    " 15000→port: 8080",
    " 29999→tango zulu quartz",
    " 30000→tango zulu quartz",
  ])
    expect(prompt).toContain(line);
  expect(prompt).not.toContain(" 14999→");
  expect(prompt).toMatch(/\[\d+ lines not shown\]/);
  expect(prompt).toContain("The tool did not give the note");
});

test("after the session, the prompt gives each labeled line of a cut result again, under its call", () => {
  const prompt = digestPrompt(session(readText(30_000))) ?? "";
  const after = prompt.slice(prompt.indexOf("</session>"));
  expect(after).toContain("Copy each of these lines into the handoff.");
  expect(after).toContain(
    'Call: Read {"file_path":"a.txt"}\n   300→KEY-1: cobalt-otter-17',
  );
});

test("with no cut result, the prompt gives no list of labeled lines and no note about the cut lines", () => {
  const prompt = digestPrompt(session(readText(600)));
  expect(prompt).not.toContain("Copy each of these lines");
  expect(prompt).not.toContain("The tool did not give the note");
});

test("a small result stays whole, and the large results share the rest of the room", () => {
  expect(resultShare([10, 20], 100)).toBe(Number.POSITIVE_INFINITY);
  expect(resultShare([10, 500, 500], 110)).toBe(50);
  const small = "CODEWORD: velvet\nline 2 of b.txt";
  const big = readText(30_000);
  const messages: SessionMessage[] = [
    ...session(big),
    {
      role: "assistant",
      text: "",
      toolUses: [{ tool_use_id: "t2", tool: "Read", input: {}, text: small }],
    },
  ];
  expect(digestPrompt(messages)).toContain(`Result:\n${small}`);
});

test("a result of only labeled lines that does not fit gives no digest", () => {
  expect(digestPrompt(session("k: v\n".repeat(20_000)))).toBeNull();
});

test("the result of a call comes from the tool results when the call has no text", () => {
  const messages: SessionMessage[] = [
    {
      role: "assistant",
      text: "",
      toolUses: [{ tool_use_id: "t9", tool: "Read", input: {} }],
    },
    {
      role: "user",
      text: "",
      toolUses: [],
      toolResults: [
        { tool_use_id: "t9", text: "CODEWORD: velvet", isError: false },
      ],
    },
  ];
  expect(digestPrompt(messages)).toContain("Result:\nCODEWORD: velvet");
});

test("kept lines of a short text are the text", () => {
  expect(keptLines("a\nb", 0)).toBe("a\nb");
});
