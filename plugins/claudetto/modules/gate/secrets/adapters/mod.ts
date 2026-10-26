// The mod handler of the `secrets` slice (task 19.16 of change `redesign-0-4-0`): `tool.call` on each tool.
// A program may load the keys of an env file, but the model never reads a value, so the handler calls `next` and replaces each value in the result.
// It lists the env files of the project itself with `rg`, else `find`, and reads a file again only when its modification time changes.
// A value of `ENV_PERSIST_MIN` or more characters that an env file held stays replaced by its slow hash in `$.state`, which holds no value, also when the file is gone and after a reload of the mod in the same session (task 19.20).
// A shorter value stays in the memory of the mod only, because a short value falls to a brute force of its record fast. `$.state` has no file, so no tool call of the agent can read a record.
// The Mod API gives a result with `ref` and `text` as core made them, and core uses them as they are, so a changed result leaves both out.

import type { EngineInterface, ToolCallResult } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { projectRoot } from "../../../project/index.ts";
import { ENV_FILE } from "../../domain/paths.ts";
import {
  ENV_CONFIRMS_MAX,
  ENV_FILE_CHARS,
  ENV_FILES_MAX,
  ENV_HASHES_PER_READ,
  ENV_HEAD_BITS,
  ENV_PERSIST_MIN,
  ENV_SCAN_CACHE_MS,
  ENV_SCAN_MS,
  ENV_STATE_TRIES_MAX,
  ENV_VALUES_MAX,
} from "../../limits.ts";
import {
  type Entry,
  type Mask,
  masksOf,
  needlesOf,
  parseEnv,
  scrub,
  scrubDeep,
} from "../domain/env.ts";
import {
  type Hashed,
  hashOf,
  newBudget,
  newSalt,
  SALT_ID,
  scrubHashed,
  validHashes,
} from "../domain/hashes.ts";
import {
  CUT,
  SHORT_VALUES_FULL,
  UNMASKED,
  WHY_FILES,
  WHY_SCAN,
  WHY_SIZE,
  WHY_VALUES,
} from "../prompts.ts";

const hashedRef = { plugin: "claudetto", key: "envHashes" } as const;

/** The entries of each env file by path, with the modification time of the read. The mod may load again in the same session, and then the files are read once more. A file that is gone leaves the hold. */
const held = new Map<
  string,
  { mtimeMs: number; entries: Entry[]; isLong: boolean }
>();

/** The texts that this run put in the state, so that the state is written only for a new one. */
const noted = new Set<string>();

/** The records that a write to the state has not set yet, by needle, so that a write that missed does not hash again. The salt stands apart, because a state with no salt gets a new one in each try. */
const unsaved = new Map<
  string,
  { salt: string; hash: string; record: Hashed[string] }
>();
let unsavedSalt: string | undefined;

/** The values and the lines of a multiline value shorter than `ENV_PERSIST_MIN` that an env file held, by key and value, with the file that held them, for the life of the mod. The state never holds them. A value goes when its file still exists and no longer holds it, and stays when its file is gone. */
const remembered = new Map<
  string,
  { entry: Entry; path: string | undefined }
>();

/** The last list of env files of a scan, with the time of the scan. */
let listed:
  | { root: string; at: number; files: string[]; why: string | undefined }
  | undefined;

/** The lines of the output of a listing that name an env file. */
const named = (root: string, stdout: string): string[] =>
  stdout
    .split("\n")
    .filter((l) => l !== "" && ENV_FILE.test(l.slice(l.lastIndexOf("/") + 1)))
    .map((l) => (l.startsWith("/") ? l : `${root}/${l}`));

/** The env files under `root` at any depth, without `node_modules` and `.git`, and the reason when a bound cut the list. */
const scan = async (
  $: EngineInterface,
  root: string,
): Promise<{ files: string[]; why: string | undefined }> => {
  const run = (argv: string[]) =>
    $.process
      .run(argv, { cwd: root, timeoutMs: ENV_SCAN_MS })
      .catch(() => undefined);
  let out = await run([
    ...["rg", "--files", "--hidden", "--no-ignore"],
    ...["-g", ".env*", "-g", "*.env", "-g", "!node_modules", "-g", "!.git"],
    root,
  ]);
  if (out === undefined || out.exitCode > 1)
    out = await run([
      ...["find", root, "(", "-name", "node_modules", "-o", "-name", ".git"],
      ...[")", "-prune", "-o", "-type", "f", "(", "-name", ".env*"],
      ...["-o", "-name", "*.env", ")", "-print"],
    ]);
  if (out === undefined || out.exitCode > 1)
    return { files: [], why: WHY_SCAN };
  const files = named(root, out.stdout).sort(
    (a, b) => a.split("/").length - b.split("/").length,
  );
  const why =
    out.isStdoutTruncated || files.length > ENV_FILES_MAX
      ? WHY_FILES({ max: ENV_FILES_MAX })
      : undefined;
  return { files: files.slice(0, ENV_FILES_MAX), why };
};

/** The entries of the env file `path`, from the hold when its modification time is the same, and whether the file is too long to read. */
const entriesOf = async (
  $: EngineInterface,
  path: string,
): Promise<{ entries: Entry[]; isLong: boolean }> => {
  const stat = await $.fs.stat(path).catch(() => undefined);
  if (stat === undefined || stat.kind !== "file") {
    held.delete(path);
    return { entries: [], isLong: false };
  }
  if (stat.size > ENV_FILE_CHARS) return { entries: [], isLong: true };
  const kept = held.get(path);
  if (kept?.mtimeMs === stat.mtimeMs) return kept;
  const text = await $.fs.read(path).catch(() => undefined);
  if (typeof text !== "string") {
    // A failed read is not a file with no values: the path leaves the hold, so it is not readable and its remembered values stay.
    held.delete(path);
    return { entries: [], isLong: false };
  }
  const isLong = text.length > ENV_FILE_CHARS;
  const entries = isLong ? [] : parseEnv(text);
  const read = { mtimeMs: stat.mtimeMs, entries, isLong };
  held.set(path, read);
  return read;
};

/** Adds to `known` a record for each needle of a value of `ENV_PERSIST_MIN` or more characters that a run has not noted, and gives whether it added one, whether `ENV_VALUES_MAX` left a needle without a record, and the needles that the state holds once `known` is written. A needle that is shorter, such as a short line of a long value, gets no record. A needle whose write missed keeps its hash in `unsaved`. */
const persist = (
  known: Hashed,
  entries: readonly Entry[],
): { isChanged: boolean; isFull: boolean; held: string[] } => {
  let isChanged = false;
  let isFull = false;
  let made = 0;
  const held: string[] = [];
  const longs = entries.filter((e) => e.value.length >= ENV_PERSIST_MIN);
  for (const [needle, key] of needlesOf(longs)) {
    if (noted.has(needle) || needle.length < ENV_PERSIST_MIN) continue;
    if (Object.keys(known).length > ENV_VALUES_MAX) {
      isFull = true;
      break;
    }
    if (made >= ENV_HASHES_PER_READ) break;
    const salt = known[SALT_ID]?.key ?? unsavedSalt ?? newSalt();
    unsavedSalt = salt;
    let staged = unsaved.get(needle);
    if (staged?.salt !== salt || staged.record.key !== key) {
      const [hash, record] = hashOf(salt, key, needle);
      staged = { salt, hash, record };
      unsaved.set(needle, staged);
      made++;
    }
    if (!(staged.hash in known)) {
      known[SALT_ID] = { key: salt, len: 0, head: ENV_HEAD_BITS };
      known[staged.hash] = staged.record;
      isChanged = true;
    }
    held.push(needle);
  }
  return { isChanged, isFull, held };
};

/** The records of the state with those of `entries` added, written with `ifVersion` up to `ENV_STATE_TRIES_MAX` tries: a try misses when a parallel call wrote first, and then the records are read again and merged. A needle is noted only after its write is set, so a miss is tried again by the next call, which writes the hashes of `unsaved` and makes no new one. Gives the records of the last try, and whether `ENV_VALUES_MAX` left a value without a record. */
const saveHashes = async (
  $: EngineInterface,
  entries: readonly Entry[],
  first: { value: unknown; version: number },
): Promise<{ known: Hashed; isFull: boolean }> => {
  let read = first;
  for (let tries = 1; ; tries++) {
    const known = validHashes(read.value);
    // A record that does not fit the shape is dropped, and the state is written without it.
    const isDropped =
      Object.keys(known).length !== Object.keys(read.value ?? {}).length;
    const { isChanged, isFull, held } = persist(known, entries);
    const isSet =
      !(isChanged || isDropped) ||
      (await $.state.set(hashedRef, known, { ifVersion: read.version })).isSet;
    if (isSet) {
      for (const needle of held) {
        noted.add(needle);
        unsaved.delete(needle);
      }
      if (unsaved.size === 0) unsavedSalt = undefined;
    }
    if (isSet || tries >= ENV_STATE_TRIES_MAX) return { known, isFull };
    read = await $.state.get(hashedRef);
  }
};

/** The entries to keep in memory for `entries`: a value shorter than `ENV_PERSIST_MIN` and each line of a longer one that is shorter, when `needlesOf` would mask it. */
const shortsOf = (entries: readonly Entry[]): Entry[] =>
  entries
    .flatMap(({ key, value }) => [
      { key, value },
      ...(value.includes("\n") ? value.split("\n") : []).map((l) => ({
        key,
        value: l.trim(),
      })),
    ])
    .filter(
      (e) => e.value.length < ENV_PERSIST_MIN && needlesOf([e]).length > 0,
    );

/** Updates `remembered` with the short `shorts` of a scan: a value goes when its file is in `readable` and no longer holds it, and a new value is added up to `ENV_VALUES_MAX`. Gives whether the bound left a value out. */
const rememberShorts = (
  shorts: readonly { entry: Entry; path: string | undefined }[],
  readable: ReadonlySet<string>,
): boolean => {
  const current = new Set(shorts.map(({ entry }) => idOf(entry)));
  for (const [id, { path }] of remembered)
    if (path !== undefined && readable.has(path) && !current.has(id))
      remembered.delete(id);
  let isFull = false;
  for (const { entry, path } of shorts) {
    const id = idOf(entry);
    if (remembered.size < ENV_VALUES_MAX || remembered.has(id))
      remembered.set(id, { entry, path: remembered.get(id)?.path ?? path });
    else isFull = true;
  }
  return isFull;
};

/** The key of an entry in `remembered`. */
const idOf = ({ key, value }: Entry): string => `${key}=${value}`;

/** The masks of each value of the env files of the project and of `extra`, the hashes of each value that a file held, the entries that the scan read, and the reason when a bound left a file unmasked. A scan reuses the last list when it is younger than `ENV_SCAN_CACHE_MS` and `isFresh` is not set. */
const masksOfProject = async (
  $: EngineInterface,
  isFresh: boolean,
  extra: readonly Entry[] = [],
): Promise<{
  masks: Mask[];
  known: Hashed;
  entries: Entry[];
  why: string | undefined;
  isShortFull: boolean;
}> => {
  const root = (
    await projectRoot({
      dir: () => $.env.get("CLAUDE_PROJECT_DIR"),
      root: () => $.session.root(),
    })
  ).replace(/\/+$/, "");
  const stored = await $.state.get(hashedRef);
  if (root === "")
    return {
      masks: [],
      known: validHashes(stored.value),
      entries: [],
      why: undefined,
      isShortFull: false,
    };
  if (
    isFresh ||
    listed === undefined ||
    listed.root !== root ||
    Date.now() - listed.at > ENV_SCAN_CACHE_MS
  )
    listed = { root, at: Date.now(), ...(await scan($, root)) };
  const entries: Entry[] = [...extra];
  let why = listed.why;
  const shorts: { entry: Entry; path: string | undefined }[] = shortsOf(
    extra,
  ).map((entry) => ({ entry, path: undefined }));
  const readable = new Set<string>();
  for (const path of listed.files) {
    const read = await entriesOf($, path);
    entries.push(...read.entries);
    if (read.isLong) why = WHY_SIZE({ max: ENV_FILE_CHARS });
    else if (held.has(path)) readable.add(path);
    shorts.push(...shortsOf(read.entries).map((entry) => ({ entry, path })));
  }
  const isShortFull = rememberShorts(shorts, readable);
  const { known, isFull } = await saveHashes($, entries, stored);
  if (isFull && why === undefined) why = WHY_VALUES({ max: ENV_VALUES_MAX });
  return {
    masks: masksOf([
      ...entries,
      ...[...remembered.values()].map(({ entry }) => entry),
    ]),
    known,
    entries,
    why,
    isShortFull,
  };
};

/** `tool.call` on each tool: the result and the context of the call have no value of an env file, and a key stands in its place. A bound of the scan adds one line to the context. A fault of the read leaves the result as it is. */
export const onResult: Handler<"tool.call"> = async ($, e, next) => {
  // The values are read before the call, because the call can move or delete the file. The masks after the call hold them too.
  const before = await masksOfProject($, false).catch(() => undefined);
  const answer = await next(e);
  if (answer.deny !== undefined) return answer;
  try {
    const { masks, known, why, isShortFull } = await masksOfProject(
      $,
      true,
      before?.entries,
    );
    const budget = newBudget(known);
    const clean = (t: string): string =>
      scrubHashed(scrub(t, masks), known, budget);
    const result = scrubDeep(answer.result, clean);
    const scrubbed = answer.context?.map(clean);
    const text = answer.text === undefined ? undefined : clean(answer.text);
    const lines = [
      ...(why === undefined ? [] : [UNMASKED({ why })]),
      ...(isShortFull ? [SHORT_VALUES_FULL({ max: ENV_VALUES_MAX })] : []),
      ...(budget.isCut ? [CUT({ max: ENV_CONFIRMS_MAX })] : []),
    ];
    const context =
      lines.length === 0 ? scrubbed : [...(scrubbed ?? []), ...lines];
    if (
      result === answer.result &&
      text === answer.text &&
      lines.length === 0 &&
      scrubbed?.every((c, i) => c === answer.context?.[i]) !== false
    )
      return answer;
    return {
      result,
      ...(context === undefined ? {} : { context }),
      ...(answer.isError ? { isError: true, text } : {}),
    } as ToolCallResult;
  } catch {
    // The rule is a help, and a fault of it must not hide the result of the tool.
    return answer;
  }
};
