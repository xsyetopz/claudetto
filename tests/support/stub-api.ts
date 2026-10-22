// A stub of the Messages API and a `claude` run against it, with no login and no cost.
// The stub saves each request body and answers each request with the text `done`, or with tool calls.
// The run has a new `CLAUDE_CONFIG_DIR` and `HOME`, so it reads no settings, plugins, or rules of the host.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { STUB_RUN_TIMEOUT_MS } from "../../tools/limits.ts";

export type Capture = {
  /** The bodies of the `/v1/messages` requests, in order. */
  requests: Record<string, unknown>[];
  /** The messages of `--output-format stream-json`, with the `system` `init` message first, or none in a terminal run. */
  events: Record<string, unknown>[];
  /** The text of the `--debug-file` log. */
  debug: string;
  /** The raw output of a terminal run, with its escape sequences, or an empty text. */
  screen: string;
};

export type Run = {
  prompt?: string;
  /** More flags of `claude`, such as `--permission-mode plan`. */
  args?: string[];
  /** The tool calls of the first answer, so that the next request carries their results. */
  calls?: { name: string; input: object }[];
  /** The `input_tokens` that each answer reports, such as a count near the compaction threshold. */
  tokens?: number;
  /** Writes files into the new config folder and project before the run. */
  prepare?: (dirs: { config: string; project: string }) => void;
  /** Runs Claude Code in a terminal, and stops it when the screen text matches. */
  until?: RegExp;
};

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
/** The start of a terminal title, `OSC 0`. */
export const TITLE = `${ESC}]0;`;
const MOVE = new RegExp(`${ESC}\\[\\d*[CG]`, "g");
const SEQUENCE = new RegExp(
  `${ESC}\\][^${BEL}]*${BEL}|${ESC}\\[[0-9;?<>=]*[a-zA-Z~]|${ESC}.`,
  "g",
);

/** The text of terminal output with no escape sequences, and a space for each cursor move to the right or to a column. */
export const plain = (screen: string): string =>
  screen.replace(MOVE, " ").replace(SEQUENCE, "");

type Block = Record<string, unknown> & { type: string };

/** The stream of one answer: the tool calls `calls`, or the text `done` when there is none. */
const sse = (model: string, calls: Run["calls"] = [], tokens = 1): string => {
  const blocks: [Block, object][] = calls.length
    ? calls.map(({ name, input }, i) => [
        { type: "tool_use", id: `toolu_stub_${i}`, name, input: {} },
        { type: "input_json_delta", partial_json: JSON.stringify(input) },
      ])
    : [
        [
          { type: "text", text: "" },
          { type: "text_delta", text: "done" },
        ],
      ];
  return [
    [
      "message_start",
      {
        message: {
          id: "msg_stub",
          type: "message",
          role: "assistant",
          model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: tokens, output_tokens: 1 },
        },
      },
    ],
    ...blocks.flatMap(([content_block, delta], index) => [
      ["content_block_start", { index, content_block }],
      ["content_block_delta", { index, delta }],
      ["content_block_stop", { index }],
    ]),
    [
      "message_delta",
      {
        delta: {
          stop_reason: calls.length ? "tool_use" : "end_turn",
          stop_sequence: null,
        },
        usage: { output_tokens: 1 },
      },
    ],
    ["message_stop", {}],
  ]
    .map(
      ([type, data]) =>
        `event: ${type}\ndata: ${JSON.stringify({ type, ...(data as object) })}\n\n`,
    )
    .join("");
};

/** The output of `argv` in a terminal, read until its text matches `until` or the run ends. */
const inTerminal = async (
  argv: string[],
  options: { cwd: string; env: Record<string, string> },
  until: RegExp,
): Promise<string> => {
  let screen = "";
  // A stream decoder, because a chunk can end inside a character.
  const decoder = new StringDecoder("utf8");
  const run = Bun.spawn(argv, {
    ...options,
    terminal: {
      cols: 120,
      rows: 40,
      data: (_terminal, data) => {
        screen += decoder.write(Buffer.from(data));
      },
    },
  });
  const end = Date.now() + STUB_RUN_TIMEOUT_MS;
  while (
    !until.test(plain(screen)) &&
    Date.now() < end &&
    run.exitCode === null
  )
    await Bun.sleep(100);
  run.kill();
  await run.exited;
  return screen;
};

/** The stream-json messages of a run of `argv` with `-p`. */
const headless = async (
  argv: string[],
  options: { cwd: string; env: Record<string, string> },
): Promise<Capture["events"]> => {
  // An async spawn, because a sync spawn blocks the stub server of this process.
  const run = Bun.spawn(
    [...argv, "-p", "--output-format", "stream-json", "--verbose"],
    {
      ...options,
      stdout: "pipe",
      stderr: "ignore",
      timeout: STUB_RUN_TIMEOUT_MS,
    },
  );
  const out = await new Response(run.stdout).text();
  await run.exited;
  return out
    .split("\n")
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>);
};

/** Runs `claude` with `settings` as the user settings, and returns what the stub saw and what Claude Code wrote. */
export const stubCapture = async (
  settings: object,
  { prompt = "say hi", args = [], calls, tokens, prepare, until }: Run = {},
): Promise<Capture> => {
  const requests: Capture["requests"] = [];
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch: async (req) => {
      if (new URL(req.url).pathname !== "/v1/messages")
        return new Response(null, { status: 404 });
      const body = (await req.json()) as Record<string, unknown>;
      requests.push(body);
      // Only the first answer calls the tools, so the run ends after one tool turn.
      const first = requests.length === 1 ? calls : [];
      return new Response(sse(String(body["model"]), first, tokens), {
        headers: { "content-type": "text/event-stream" },
      });
    },
  });
  // The real path, because Claude Code names the memory folder of the project by it.
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "stub-capture-")),
  );
  const [config, project] = ["config", "project"].map((d) => {
    fs.mkdirSync(path.join(root, d));
    return path.join(root, d);
  }) as [string, string];
  await Bun.write(path.join(config, "settings.json"), JSON.stringify(settings));
  // The state of a finished first start, so that a terminal run shows no onboarding, trust, or key dialog.
  await Bun.write(
    path.join(config, ".claude.json"),
    JSON.stringify({
      hasCompletedOnboarding: true,
      theme: "dark",
      customApiKeyResponses: { approved: ["sk-ant-dummy".slice(-20)] },
      projects: { [project]: { hasTrustDialogAccepted: true } },
    }),
  );
  const debugFile = path.join(root, "debug.log");
  const argv = [
    "claude",
    prompt,
    "--debug-file",
    debugFile,
    ...(calls ?? []).flatMap(({ name, input }) =>
      name === "Bash"
        ? ["--allowedTools", `Bash(${(input as { command: string }).command})`]
        : [],
    ),
    ...args,
  ];
  const options = {
    cwd: project,
    env: {
      PATH: process.env["PATH"] ?? "",
      HOME: root,
      TERM: "xterm-256color",
      SHELL: "/bin/zsh",
      CLAUDE_CONFIG_DIR: config,
      ANTHROPIC_API_KEY: "sk-ant-dummy",
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.port}`,
      CLAUDE_CODE_MAX_RETRIES: "0",
    },
  };
  try {
    Bun.spawnSync(["git", "init", "-q"], { cwd: project });
    prepare?.({ config, project });
    const screen = until ? await inTerminal(argv, options, until) : "";
    const events = until ? [] : await headless(argv, options);
    const log = Bun.file(debugFile);
    const debug = (await log.exists()) ? await log.text() : "";
    return { requests, events, debug, screen };
  } finally {
    server.stop(true);
    fs.rmSync(root, { recursive: true, force: true });
  }
};
