// The write targets of one simple shell command (task 29.9), as pure functions.
// A target is `{ form, word, folders?, mode?, pathOnly?, needsExist? }`.
// `mode` is `"create"` for a form that makes the file and `"append"` for one that only adds to it.
// `folders` is true when the word counts as each file under it. `pathOnly` is true when only the kinds from the path alone apply.
// `needsExist` is true when the word is a target only if the file exists, because it can be a ref (`git checkout`).
// The write forms are in `limits.mjs`. The shell reader is `lib/shell.mjs`.

import { stripWrappers } from "../../lib/wrappers.mjs";
import { gitCall } from "./git.mjs";
import {
  SHELL_COPIES,
  SHELL_FIND,
  SHELL_GIT_MOVES,
  SHELL_GIT_REMOVES,
  SHELL_GIT_RESTORES,
  SHELL_IN_PLACE,
  SHELL_LINKS,
  SHELL_MOVES,
  SHELL_OPTIONS,
  SHELL_REMOVES,
  SHELL_TEE,
} from "./limits.mjs";

const NO_OPTIONS = { letters: "", suffix: "", long: [] };
const FIND_NAMES = new Set([
  "-name",
  "-iname",
  "-path",
  "-ipath",
  "-wholename",
]);
const FIND_EXEC = new Set(["-exec", "-execdir", "-ok", "-okdir"]);

/** The flags, option values, and operands of `args`, read with the option table `spec`. */
function split(args, spec = NO_OPTIONS) {
  const o = {
    short: new Set(),
    long: new Set(),
    values: new Map(),
    operands: [],
  };
  for (let k = 0; k < args.length; k++) {
    const w = args[k];
    if (w === "--") {
      o.operands.push(...args.slice(k + 1));
      break;
    }
    if (w.startsWith("--")) {
      const [name, ...rest] = w.slice(2).split("=");
      o.long.add(name);
      if (spec.long.includes(name))
        o.values.set(name, rest.length ? rest.join("=") : args[++k]);
    } else if (w.length > 1 && w.startsWith("-")) {
      for (let c = 1; c < w.length; c++) {
        o.short.add(w[c]);
        if (spec.suffix.includes(w[c])) break;
        if (spec.letters.includes(w[c])) {
          o.values.set(w[c], c + 1 < w.length ? w.slice(c + 1) : args[++k]);
          break;
        }
      }
    } else o.operands.push(w);
  }
  return o;
}

const has = (o, short, long) => o.short.has(short) || o.long.has(long);
const base = (word) => word.replace(/^.*\//, "");

/** The paths that `cp`, `mv`, `install`, or `ln` writes: the folder of `-t`, or the last operand. A folder gets the name of each source. */
function destinations(o) {
  const dir = o.values.get("t") ?? o.values.get("target-directory");
  const from = dir === undefined ? o.operands.slice(0, -1) : o.operands;
  const to = dir ?? o.operands.at(-1);
  if (to === undefined || (dir === undefined && o.operands.length < 2))
    return [];
  const folder = dir !== undefined || to.endsWith("/");
  return folder
    ? from.map((s) => `${to.replace(/\/*$/, "/")}${base(s)}`)
    : [to];
}

/** The paths that `mv` removes: each operand, but the last one when it is the destination. */
function sources(o) {
  const dir = o.values.get("t") ?? o.values.get("target-directory");
  return dir === undefined && o.operands.length > 1
    ? o.operands.slice(0, -1)
    : o.operands;
}

/** The targets of `mv` and `git mv`: each source is removed, and each destination is created or overwritten. */
function moves(form, o) {
  const to = new Set(destinations(o));
  return [
    ...sources(o).map((word) => ({ form, word, folders: true })),
    ...[...to].map((word) => ({ form, word, mode: "create" })),
  ];
}

/**
 * The targets of a `find` that deletes.
 * With a `-name` or `-path` filter, the targets are the filter values only, each joined with each start path.
 * A `-name` value alone is also a target, because it can show a test file name (`*.test.mjs`).
 * A `-name` value joined with a start path counts for the kinds from the path alone, so a file in a test folder that is not a test file gets no ask.
 * With no filter, the targets are the start paths.
 */
function findTargets(args) {
  const at = args.findIndex((w) => /^[-(!,]/.test(w));
  const rest = at < 0 ? [] : args.slice(at);
  const execs = rest.flatMap((w, k) =>
    FIND_EXEC.has(w) ? [base(rest[k + 1] ?? "")] : [],
  );
  const removes =
    rest.includes("-delete") || execs.some((c) => SHELL_REMOVES.includes(c));
  if (!removes) return [];
  const form = rest.includes("-delete") ? "find -delete" : "find -exec rm";
  const names = rest.filter((w, k) => FIND_NAMES.has(w) && rest[k + 1]);
  const starts = at < 0 ? args : args.slice(0, at);
  if (!names.length)
    return starts.map((word) => ({ form, word, folders: true }));
  const roots = starts.length ? starts : ["."];
  const join = (start, name) =>
    start === "." ? name : `${start.replace(/\/*$/, "")}/${name}`;
  return rest.flatMap((w, k) => {
    const name = rest[k + 1];
    if (!FIND_NAMES.has(w) || name === undefined) return [];
    const byName = w === "-name" || w === "-iname";
    return [
      ...(byName ? [{ form, word: name }] : []),
      ...roots.map((start) => ({
        form,
        word: join(start, name),
        pathOnly: byName,
      })),
    ];
  });
}

/** The `{ form, word }` targets of one simple command `argv`. `mode` is `"create"` for a form that makes the file, and `"append"` for one that only adds to it. */
export function targets(argv) {
  const words = stripWrappers(argv);
  const name = base(words[0] ?? "");
  const args = words.slice(1);
  const spec = SHELL_OPTIONS[name] ?? NO_OPTIONS;
  const o = split(args, spec);
  const hit = (form, list) => list.map((word) => ({ form, word }));
  if (SHELL_IN_PLACE.includes(name)) {
    if (!has(o, "i", "in-place")) return [];
    const scripted = ["e", "E", "f", "expression", "file"].some((k) =>
      o.values.has(k),
    );
    // BSD `sed -i ''` gives an empty suffix word, which is not an operand.
    const files = o.operands.filter((w) => w !== "");
    return hit(`${name} -i`, scripted ? files : files.slice(1));
  }
  if (SHELL_TEE.includes(name))
    return hit(name, o.operands).map((t) => ({
      ...t,
      mode: has(o, "a", "append") ? "append" : "create",
    }));
  if (SHELL_COPIES.includes(name))
    return name === "install" && o.short.has("d")
      ? []
      : hit(name, destinations(o)).map((t) => ({ ...t, mode: "create" }));
  if (SHELL_MOVES.includes(name)) return moves(name, o);
  if (SHELL_FIND.includes(name)) return findTargets(args);
  if (SHELL_REMOVES.includes(name)) {
    const folders = has(o, "r", "recursive") || o.short.has("R");
    return hit(name, o.operands).map((t) => ({ ...t, folders }));
  }
  if (SHELL_LINKS.includes(name))
    return has(o, "f", "force")
      ? hit(`${name} -f`, destinations(o)).map((t) => ({
          ...t,
          mode: "create",
        }))
      : [];
  const git = name === "git" ? gitCall(words) : null;
  if (git && SHELL_GIT_RESTORES.includes(git.sub)) return gitTargets(git);
  if (git && SHELL_GIT_REMOVES.includes(git.sub)) return gitRemoves(git);
  if (git && SHELL_GIT_MOVES.includes(git.sub))
    return moves(`git ${git.sub}`, split(git.args));
  return [];
}

/** The targets of `git rm`. With `--cached`, it removes from the index only and writes no file. */
function gitRemoves({ sub, args }) {
  const o = split(args);
  if (o.long.has("cached")) return [];
  const folders = has(o, "r", "recursive");
  return o.operands.map((word) => ({ form: `git ${sub}`, word, folders }));
}

/** The targets of `git checkout [<ref>] [--] <path>` and `git restore <path>`. A restore of the index only writes no file. */
function gitTargets({ sub, args }) {
  const form = `git ${sub}`;
  if (sub === "checkout") {
    const at = args.indexOf("--");
    if (at >= 0) return args.slice(at + 1).map((word) => ({ form, word }));
    // `-b`, `-B`, and `--orphan` make a branch, and the operands are refs.
    const o = split(args, SHELL_OPTIONS.checkout);
    if (["b", "B"].some((k) => o.short.has(k)) || o.long.has("orphan"))
      return [];
    return o.operands.map((word) => ({ form, word, needsExist: true }));
  }
  const o = split(args, SHELL_OPTIONS.restore);
  const indexOnly = has(o, "S", "staged") && !has(o, "W", "worktree");
  return indexOnly ? [] : o.operands.map((word) => ({ form, word }));
}
