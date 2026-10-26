// The mod handlers of the `prompt` slice:
// `prompt.context` adds the blocks `context_management` (the compaction state), `shell`, `plan` (the `plan` option), and `repo` (X5: branch, latest tag, open change, shell, `grep` engine).
// `tool.describe` gives each kept tool the shorter claudetto text, and defers the tools of `DEFERRED_TOOLS`.
// `prompt.attachment` turns the `off` attachments off, and gives the plan mode text a shorter text that names `claudetto:Artemis`.
// `session.compact` adds the compaction line of the `built-in` path.
// `classic.PostToolUse` counts the tool calls of each subagent, and adds the turn line once at the bound of its type. `classic.SubagentStop` clears the count.
// `session.measure` keeps the band of each rate-limit window, and the next `classic.UserPromptSubmit` or `classic.PostToolBatch` adds the usage line once when a band changed.

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { pluginOptions } from "../../../../kernel/options.ts";
import { CHANGES_DIR, readChanges } from "../../../project/index.ts";
import { isBuiltInCompaction } from "../../domain/compaction.ts";
import { sharesOf } from "../../domain/usage.ts";
import {
  CONTEXT_BLOCK,
  CONTEXT_TEXT,
  compactionState,
} from "../domain/compaction.ts";
import { SHELL_BLOCK, shellFacts } from "../domain/environment.ts";
import {
  PLAN_BLOCK,
  planLine,
  REPO_BLOCK,
  repoFacts,
  usesUgrep,
} from "../domain/facts.ts";
import { planModeText } from "../domain/plan-mode.ts";
import { DEFERRED_TOOLS, TOOL_TEXTS } from "../domain/tools.ts";
import { type Calls, nextCalls, withoutCalls } from "../domain/turns.ts";
import { nextUsage } from "../domain/usage.ts";
import {
  FACT_CHANGES_MAX,
  FACT_RUN_TIMEOUT_MS,
  PROMPT_SIZE_MAX_CHARS,
  STATE_TRIES_MAX,
} from "../limits.ts";
import {
  PRECOMPACT_LINE,
  PROMPT_SIZE_LINE,
  TURN_LIMIT_LINE,
} from "../prompts.ts";

/** The value of an env read, or `""` when it is unset or the read fails. */
const envValue = (read: Promise<string | undefined>): Promise<string> =>
  read.then(
    (value) => value ?? "",
    () => "",
  );

/** The output of a run, or `""` when it fails. */
const output = (
  run: Promise<{ exitCode: number; stdout: string }>,
): Promise<string> =>
  run.then(
    (r) => (r.exitCode === 0 ? r.stdout : ""),
    () => "",
  );

/** The shell facts of this process: `uname -s` runs one time, and a failed run gives no platform. */
let facts: Promise<string> | undefined;
const shellFactsOf = ($: EngineInterface): Promise<string> => {
  facts ??= Promise.all([
    output($.process.run(["uname", "-s"])),
    envValue($.env.get("SHELL")),
  ]).then(([platform, shell]) => shellFacts(platform, shell));
  return facts;
};

/** The repository facts of this process: the runs go one time, and a failed run gives an empty fact, because a throw here drops the `context_management` block too. */
let repo: Promise<string> | undefined;
const repoFactsOf = async ($: EngineInterface): Promise<string> => {
  repo ??= (async () => {
    const cwd = await $.session.cwd().catch(() => "");
    if (cwd === "") return "";
    const out = (argv: string[]) =>
      output($.process.run(argv, { cwd, timeoutMs: FACT_RUN_TIMEOUT_MS }));
    const [branch, tag, shell, execPath, entrypoint, toolNames, changes] =
      await Promise.all([
        out(["git", "branch", "--show-current"]),
        out(["git", "describe", "--tags", "--abbrev=0"]),
        envValue($.env.get("SHELL")),
        envValue($.env.get("CLAUDE_CODE_EXECPATH")),
        envValue($.env.get("CLAUDE_CODE_ENTRYPOINT")),
        // A failed read counts as `Grep` on, so the block never claims `ugrep` from a guess.
        $.tool.list().then(
          (tools) => tools.map((t) => t.name),
          () => ["Grep"],
        ),
        readChanges(
          `${cwd}/${CHANGES_DIR}`,
          { list: (dir) => $.fs.list(dir), read: (file) => $.fs.read(file) },
          FACT_CHANGES_MAX,
        ),
      ]);
    const ugrep = usesUgrep({ execPath, toolNames, entrypoint });
    return repoFacts({ branch, tag, changes, shell, ugrep });
  })();
  return repo;
};

// A block of the same name from below is replaced, so each block is there one time.
export const onContext: Handler<"prompt.context"> = async ($, e, next) => {
  const { blocks, ...rest } = await next(e);
  const state = compactionState(
    pluginOptions(),
    await $.env.get("DISABLE_COMPACT"),
  );
  const shell = await shellFactsOf($);
  const plan = planLine(pluginOptions()["plan"]);
  const facts = await repoFactsOf($);
  const own = [
    { name: CONTEXT_BLOCK, text: CONTEXT_TEXT[state] },
    { name: PLAN_BLOCK, text: plan },
    { name: REPO_BLOCK, text: facts },
    { name: SHELL_BLOCK, text: shell },
  ];
  return {
    ...rest,
    blocks: [
      ...blocks.filter((b) => !own.some((o) => o.name === b.name)),
      ...own.filter((b) => b.text),
    ],
  };
};

// A tool text is ours when it is shorter than the engine text, so a shorter text of a new build stays.
// The `agents` slice and the `Agent(...)` deny rules of the settings drop the built-in agents.
export const onToolDescribe: Handler<"tool.describe"> = async (_$, e, next) => {
  const answer = await next(e);
  const text = TOOL_TEXTS[e.tool];
  const shorter =
    text !== undefined && text.length < answer.description.length
      ? { ...answer, description: text }
      : answer;
  return DEFERRED_TOOLS.includes(e.tool)
    ? { ...shorter, isDeferred: true }
    : shorter;
};

/** On the `built-in` compaction path, the summarizer gets `PRECOMPACT_LINE` after the text of `/compact`. */
export const onCompact: Handler<"session.compact"> = (_$, e, next) =>
  next(
    isBuiltInCompaction(pluginOptions())
      ? {
          ...e,
          instructions: [e.instructions, PRECOMPACT_LINE]
            .filter(Boolean)
            .join("\n\n"),
        }
      : e,
  );

/** The usage value of `$.state`: the last band of each window, the first share, and the line that waits for the next request. */
const usageRef = { plugin: "claudetto", key: "usage" } as const;

/** `session.measure`: keeps the bands, and holds one usage line when a band changed. It observes, so a fault changes nothing. */
export const onMeasure: Handler<"session.measure"> = async ($, e, next) => {
  const answer = await next(e);
  try {
    const { value } = await $.state.get(usageRef);
    const usage = nextUsage(value, sharesOf(e.rateLimits));
    if (usage !== null) await $.state.set(usageRef, usage);
  } catch {
    // A fault of the state leaves the line out.
  }
  return answer;
};

/** Adds the held usage line to `additionalContext` and clears it, so the line goes out once. */
const addLine = async <A extends { additionalContext?: string[] }>(
  $: EngineInterface,
  answer: A,
): Promise<A> => {
  try {
    const { value } = await $.state.get(usageRef);
    if (value?.line === undefined) return answer;
    const { line, ...rest } = value;
    await $.state.set(usageRef, rest);
    return {
      ...answer,
      additionalContext: [...(answer.additionalContext ?? []), line],
    };
  } catch {
    return answer;
  }
};

/** `classic.UserPromptSubmit`: adds the held usage line, and a size line for a prompt over `PROMPT_SIZE_MAX_CHARS`. */
export const onPrompt: Handler<"classic.UserPromptSubmit"> = async (
  $,
  e,
  next,
) => {
  const answer = await addLine($, await next(e));
  return e.prompt.length > PROMPT_SIZE_MAX_CHARS
    ? {
        ...answer,
        additionalContext: [
          ...(answer.additionalContext ?? []),
          PROMPT_SIZE_LINE({ chars: e.prompt.length }),
        ],
      }
    : answer;
};

/** `classic.PostToolBatch`: adds the held usage line before the next request of a turn. */
export const onBatch: Handler<"classic.PostToolBatch"> = async ($, e, next) =>
  addLine($, await next(e));

/** The calls value of `$.state`: the tool calls of each running subagent, by `agent_id`. */
const callsRef = { plugin: "claudetto", key: "calls" } as const;

/** The outcome of `updateCalls`. */
type Updated<R> =
  | { kind: "written"; result: R }
  | { kind: "idle" }
  | { kind: "lost" };

/** Reads the counts, makes `step` of them, and writes the result with the version, up to `STATE_TRIES_MAX` tries: a try fails when another write landed first, so that parallel calls and a stop lose no count and no fired flag. A step that gives `undefined` writes nothing. Gives `written` with the `result` of the step that was written, `idle` when the step wrote nothing, or `lost` when every try lost the race or the state threw, so that the caller tells "no write needed" from a count that is gone. */
const updateCalls = async <R>(
  $: EngineInterface,
  step: (
    calls: Readonly<Calls> | undefined,
  ) => { calls: Calls; result: R } | undefined,
): Promise<Updated<R>> => {
  try {
    for (let tries = 0; tries < STATE_TRIES_MAX; tries++) {
      const { value, version } = await $.state.get(callsRef);
      const next = step(value);
      if (next === undefined) return { kind: "idle" };
      const { isSet } = await $.state.set(callsRef, next.calls, {
        ifVersion: version,
      });
      if (isSet) return { kind: "written", result: next.result };
    }
  } catch {
    // A fault of the state is a count that is gone, as a lost race is.
  }
  return { kind: "lost" };
};

/** The agents that got `TURN_LIMIT_LINE` while the state was broken: a broken state loses each count, so the line goes out once for each agent and not with each call. The flag stays when the state recovers, so that the agent gets no second line at its real bound. Only the stop of the agent clears it. */
const toldWhileLost = new Set<string>();

/** Counts one call of the subagent, and tells whether its line goes out with this call. An agent that got the line while the state was broken gets none at its bound. A count that every try lost is unknown, so the line goes out one time: one extra line costs less than a missed one, and a line with each call costs more. */
const countCall = async (
  $: EngineInterface,
  id: string,
  type: string | undefined,
): Promise<boolean> => {
  const done = await updateCalls($, (value) => {
    const { calls, atBound } = nextCalls(value, id, type);
    return { calls, result: atBound };
  });
  if (done.kind === "lost") {
    if (toldWhileLost.has(id)) return false;
    toldWhileLost.add(id);
    return true;
  }
  return done.kind === "written" && done.result && !toldWhileLost.has(id);
};

/** `answer` with `TURN_LIMIT_LINE` when this call of the subagent is its first at or over the bound. The main thread has no `agent_id`, so it gets none. A fault of the state gives the line one time for the agent, through `countCall`, and a fault of `countCall` itself leaves it out. */
const withLimit = async <A extends { additionalContext?: string[] }>(
  $: EngineInterface,
  e: { agent_id?: string | undefined; agent_type?: string | undefined },
  answer: A,
): Promise<A> => {
  if (!e.agent_id) return answer;
  try {
    return (await countCall($, e.agent_id, e.agent_type))
      ? {
          ...answer,
          additionalContext: [
            ...(answer.additionalContext ?? []),
            TURN_LIMIT_LINE,
          ],
        }
      : answer;
  } catch {
    return answer;
  }
};

/** `classic.PostToolUse`: a subagent gets `TURN_LIMIT_LINE` at its first call at or over the bound of its type, one time. */
export const onSubagentCall: Handler<"classic.PostToolUse"> = async (
  $,
  e,
  next,
) => withLimit($, e, await next(e));

/** `classic.PostToolUseFailure`: a failed call of a subagent counts too. */
export const onSubagentFail: Handler<"classic.PostToolUseFailure"> = async (
  $,
  e,
  next,
) => withLimit($, e, await next(e));

/** `classic.SubagentStop`: clears the count of the subagent that ended. */
export const onSubagentEnd: Handler<"classic.SubagentStop"> = async (
  $,
  e,
  next,
) => {
  toldWhileLost.delete(e.agent_id);
  try {
    await updateCalls($, (value) =>
      value?.[e.agent_id] === undefined
        ? undefined
        : { calls: withoutCalls(value, e.agent_id), result: true },
    );
  } catch {
    // A fault of the state leaves the count to the end of the session.
  }
  return next(e);
};

// The `off` verdicts of the attachments: the list is in `domain/off.ts`, and the filter in `hooks/register.ts` narrows the event to it and to `REWRITTEN_ATTACHMENTS`.

/** An attachment of an `off` kind is left out of the request, and the plan mode text is a shorter text that points a search over many files at `claudetto:Artemis`. */
export const onAttachment = async <E extends { type: string; text: string }>(
  _$: unknown,
  e: E,
  next: (e: E) => Promise<{ text: string | null }>,
): Promise<{ text: string | null }> => {
  if (e.type !== "plan_mode") return { text: null };
  const answer = await next(e);
  return answer.text === null
    ? answer
    : { ...answer, text: planModeText(answer.text) };
};
