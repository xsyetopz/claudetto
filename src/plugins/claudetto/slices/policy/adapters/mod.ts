// The mod handlers of the `policy` slice: the AI policy gate for the repositories that are not the user's.
// `tool.call` checks each action that reaches an upstream repository: `git push`, a `gh` write, a network write to GitHub, or a write by an MCP tool.
// The first action with no verdict is denied with the list of policy files. Claude reads them and records a verdict with `ai_policy`.
// A `forbidden` verdict denies each such action for the repository, and a `conditions` verdict denies the first action of a session with the conditions.
// `claude plugin validate` follows `$` only into a function of one file, and each `$.env.get` call needs a literal name.
// For this reason, each function that touches `$` is here or in `mark.ts`, and the rules are in `domain/` and in the other adapters.

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import { answerError } from "../domain/answer.ts";
import { normalize } from "../domain/paths.ts";
import { stopNoteOf } from "../domain/stop-note.ts";
import { TOOL_FULL, toolSpec } from "../domain/tool.ts";
import { parseInput, type Stored } from "../domain/verdict.ts";
import {
  ASK_CONSENT,
  ASK_ERROR,
  DENY_CONDITIONS,
  DENY_FORBIDDEN,
  ERROR_INPUT,
  ERROR_REPO,
} from "../prompts.ts";
import {
  askOnError,
  type Call,
  type Deps,
  denyOf,
  denyOnError,
  silentRepoOf,
} from "./deny.ts";
import { type Gathered, gather } from "./gather.ts";
import { kept, NOT_RUN, runInit } from "./host.ts";
import { localReader } from "./local.ts";
import { askText, recordOf, replyOf } from "./reply.ts";
import {
  armToken,
  cacheText,
  clearTokens,
  forbiddenIn,
  loadRecord,
  mirrorLogin,
  mirrorOrgs,
  type StoreFs,
  saveRecord,
} from "./store.ts";
import {
  ghTargetOf,
  loginOf,
  orgsOf,
  type Run,
  type Target,
  targetOfPush,
} from "./target.ts";

export { keepOptions } from "./host.ts";
export { onMark } from "./mark.ts";

/** The file API of the engine, as calls, because `claude plugin validate` follows `$.fs.read(...)` and not `$.fs` as a value. */
const diskOf = ($: EngineInterface): StoreFs => ({
  exists: (path) => $.fs.exists(path),
  read: (path) => $.fs.read(path),
  list: (path) => $.fs.list(path),
  write: (path, text) => $.fs.write(path, text),
});

const homeOf = async ($: EngineInterface): Promise<string | undefined> =>
  (await $.env.get("HOME")) ?? (await $.env.get("USERPROFILE"));

/** Runs a program on the host. A program that cannot start gives `NOT_RUN`. */
const runOf =
  ($: EngineInterface): Run =>
  async (argv, cwd) => {
    try {
      const r = await $.process.run(argv, runInit(cwd));
      return { exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr };
    } catch {
      return NOT_RUN;
    }
  };

/** The checks that wait for a verdict, by repository key. */
const pending = new Map<string, Gathered>();
/** The verdicts that this module knows, by repository key. */
const decided = new Map<string, Stored>();
/** The repositories whose conditions were shown in a session, as `session NUL key`. */
const shown = new Set<string>();

/** Gathers the files of `target`. A file from GitHub goes to the cache folder under the store. */
const gatherOf = async ($: EngineInterface, target: Target) => {
  const home = await homeOf($);
  return gather(
    {
      run: runOf($),
      local: (root) => localReader(diskOf($), root),
      cache: async (key, source, path, text) => {
        if (home === undefined) return undefined;
        return cacheText(diskOf($), home, key, source, path, text);
      },
    },
    target,
  );
};

/** The stored verdict of `key`, or `undefined` when there is none or it is not valid. */
const load = async ($: EngineInterface, key: string) => {
  const home = await homeOf($);
  return home === undefined ? undefined : loadRecord(diskOf($), home, key);
};

const save = async ($: EngineInterface, record: Stored, key: string) => {
  const home = await homeOf($);
  if (home !== undefined) await saveRecord(diskOf($), home, key, record);
};

/** The token files that this module armed and has not cleared. */
const armed = new Set<string>();

/** Arms the one-time consent of this session for a push to `key`. The hook of git uses it once. */
const arm = async ($: EngineInterface, key: string) => {
  const home = await homeOf($);
  if (home === undefined) return;
  armed.add(
    await armToken(
      diskOf($),
      home,
      await $.session.id(),
      key,
      await $.clock.now(),
    ),
  );
};

/** Clears each armed token. Each tool call starts with it, so a consent does not outlive the ask. */
const disarm = async ($: EngineInterface) => {
  if (armed.size === 0) return;
  const files = [...armed];
  armed.clear();
  await clearTokens(diskOf($), files);
};

/** Writes the login, and the organizations that the user owns, where the hook of git reads them. A failed read of the organizations writes none, so the hook checks each organization. */
const mirrorOwner = async ($: EngineInterface) => {
  const home = await homeOf($);
  const login = await loginOf(runOf($));
  if (home === undefined || login === undefined) return;
  await mirrorLogin(diskOf($), home, login);
  await mirrorOrgs(diskOf($), home, (await orgsOf(runOf($))) ?? []);
};

/** The deny for an action in `target`, or `undefined` when the action may run. */
const gate = async (
  $: EngineInterface,
  target: Target,
): Promise<string | undefined> => {
  if (target.own) return undefined;
  let record = decided.get(target.key);
  if (record === undefined) {
    const g = await gatherOf($, target);
    const stored = await load($, target.key);
    if (stored?.hash === g.hash) record = stored;
    else if (g.files.length === 0 && g.notes.length === 0) {
      record = {
        repo: target.key,
        hash: g.hash,
        verdict: "silent",
        quote: "",
        conditions: "",
        time: await $.clock.now(),
      };
    } else {
      pending.set(target.key, g);
      return askText(g, (await loginOf(runOf($))) !== undefined);
    }
    decided.set(target.key, record);
    // The record is stored again, so that the file for the hook of git exists for a record from an older run.
    await save($, record, target.key);
  }
  if (record.verdict === "forbidden")
    return DENY_FORBIDDEN({ repo: target.key, quote: record.quote });
  const mark = `${await $.session.id()}\u0000${target.key}`;
  if (record.verdict !== "conditions" || shown.has(mark)) return undefined;
  shown.add(mark);
  return DENY_CONDITIONS({
    repo: target.key,
    quote: record.quote,
    conditions: record.conditions,
  });
};

/** The absolute form of a folder or path word: `~` is the home folder, and a relative word joins the session folder. */
const absOf = async ($: EngineInterface, word: string | undefined) => {
  if (word === undefined) return $.session.cwd();
  if (word.startsWith("~"))
    return normalize(`${(await homeOf($)) ?? ""}${word.slice(1)}`);
  return normalize(
    word.startsWith("/") ? word : `${await $.session.cwd()}/${word}`,
  );
};

/** A stored verdict `forbidden` in any repository: one this module knows, else one in the store folder. */
const forbiddenOf = async ($: EngineInterface) => {
  for (const r of decided.values()) if (r.verdict === "forbidden") return r;
  const home = await homeOf($);
  return home === undefined ? undefined : forbiddenIn(diskOf($), home);
};

const depsOf = ($: EngineInterface): Deps => ({
  run: runOf($),
  cwd: () => $.session.cwd(),
  abs: (word) => absOf($, word),
  push: (dir, remote) => targetOfPush(runOf($), dir, remote),
  gate: (target) => gate($, target),
  gh: (dir, spec) => ghTargetOf(runOf($), () => absOf($, dir), spec),
  forbidden: () => forbiddenOf($),
  silent: async (target) =>
    !target.own && decided.get(target.key)?.verdict === "silent",
});

export const onCall: Handler<"tool.call"> = async ($, e, next) => {
  if (!kept.on || (e.tool as string) === TOOL_FULL) return next(e);
  try {
    await disarm($);
  } catch {
    // The hook also ends a token after its time, so a failed clear does not stop the call.
  }
  let deny: string | undefined;
  try {
    deny = await denyOf(depsOf($), e as unknown as Call);
  } catch {
    // A failed check must not open a closed repository, so a call that reaches out stops. Each other call passes.
    deny = denyOnError(e as unknown as Call);
  }
  return deny === undefined ? next(e) : { deny };
};

// The ask reason of the gate comes first, then the ask reason of `next`, so the ask of another slice stays.
// The bundle returns the ask of a mod as the decision unless the engine is stricter, so no permission mode turns it into an allow.
export const onCheck: Handler<"tool.check"> = async ($, e, next) => {
  const verdict = await next(e);
  if (!kept.on || (e.tool as string) === TOOL_FULL) return verdict;
  if (verdict?.decision === "deny") return verdict;
  const call = { tool: e.tool as string, ...(e.input as object) } as Call;
  let own: string | undefined;
  try {
    const need = await silentRepoOf(depsOf($), call);
    own =
      need === undefined
        ? undefined
        : need.repo === undefined
          ? ASK_ERROR
          : ASK_CONSENT({ repo: need.repo });
    // The hook of git lets one push pass for this repository. It is cleared at the next tool call.
    if (need?.repo !== undefined && need.push) await arm($, need.repo);
  } catch {
    // A failed check must not pass an action that reaches out, so it asks.
    own = await askOnError(depsOf($), call);
  }
  if (own === undefined) return verdict;
  const reason =
    verdict?.decision === "ask" && verdict.reason
      ? `${own}\n\n${verdict.reason}`
      : own;
  return { decision: "ask", reason };
};

export const onSessionStart: Handler<"session.start"> = async ($, e, next) => {
  if (kept.on) {
    try {
      await $.tool.register(toolSpec());
      await mirrorOwner($);
    } catch {
      // A failed registration must not stop the session. The gate still denies, and the deny names the tool.
    }
  }
  return next(e);
};

/** Serves the tool `ai_policy`: it checks the input against the files of the waiting check, and stores the verdict. */
export const onPolicyTool: Handler<"tool.call"> = async ($, e) => {
  const parsed = parseInput(e as unknown as Record<string, unknown>);
  if (!parsed.ok) return { result: ERROR_INPUT({ field: parsed.field }) };
  const { input } = parsed;
  const key = input.repo.toLowerCase();
  const g = pending.get(key);
  if (g === undefined) return { result: ERROR_REPO({ repo: input.repo }) };
  const wrong = answerError(input, g.files);
  if (wrong !== undefined) return { result: wrong };
  const record = recordOf(input, g, key, await $.clock.now());
  await save($, record, key);
  decided.set(key, record);
  pending.delete(key);
  if (record.verdict === "conditions")
    shown.add(`${await $.session.id()}\u0000${key}`);
  const settings = await $.settings.read().catch(() => undefined);
  return {
    result: replyOf(record) + stopNoteOf(record.verdict, g.target, settings),
  };
};
