// The git ask (design D34, case S2): `git stash`, `git checkout -- <path>`, `git restore <path>`, and `git reset`
// move or discard work that the user or other sessions share.
// `features/guard/` asks only for `rm` and for foreign repositories, so these commands have no ask there.
// The functions are pure and read no file.

/** The shell words of each command of `command`, with quotes removed and heredoc bodies skipped. */
export function commands(command) {
  const out = [];
  let words = [];
  let word = null;
  let quote = null;
  const text = String(command ?? "");
  const heredocs = [];
  const push = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  const end = () => {
    push();
    if (words.length) out.push(words);
    words = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && i + 1 < text.length)
        word += text[++i];
      else word += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      word ??= "";
    } else if (c === "\\" && i + 1 < text.length)
      word = (word ?? "") + text[++i];
    else if (c === "<" && text[i + 1] === "<" && text[i + 2] !== "<") {
      const m = /^<<-?\s*(["']?)([A-Za-z_]\w*)\1/.exec(text.slice(i));
      if (m) heredocs.push(m[2]);
      i += m ? m[0].length - 1 : 1;
      push();
    } else if (c === "\n") {
      end();
      let pos = i + 1;
      while (heredocs.length) {
        const delimiter = heredocs.shift();
        while (pos < text.length) {
          const nl = text.indexOf("\n", pos);
          const line = text.slice(pos, nl < 0 ? text.length : nl);
          pos = nl < 0 ? text.length : nl + 1;
          if (line.trim() === delimiter) break;
        }
      }
      i = pos - 1;
    } else if (c === ";" || c === "&" || c === "|" || c === "(" || c === ")")
      end();
    else if (/\s/.test(c)) push();
    else word = (word ?? "") + c;
  }
  end();
  return out;
}

const WRAPPERS = new Set([
  "sudo",
  "command",
  "env",
  "time",
  "exec",
  "nohup",
  "nice",
]);
/** The git global options that take a value in the next word. */
const VALUE_OPTIONS = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
]);

/** The git subcommand of `words` and its arguments, or null when the command is not git. */
function gitCall(words) {
  let i = 0;
  while (i < words.length && (WRAPPERS.has(words[i]) || /^\w+=/.test(words[i])))
    i++;
  if (words[i]?.replace(/^.*\//, "") !== "git") return null;
  for (i++; i < words.length && words[i].startsWith("-"); i++)
    if (VALUE_OPTIONS.has(words[i])) i++;
  return words[i] === undefined
    ? null
    : { sub: words[i], args: words.slice(i + 1) };
}

/** The subcommands of `stash` that leave the tree as it is. */
const STASH_READS = new Set(["list", "show", "create", "store"]);
const REF =
  /^(?:HEAD|ORIG_HEAD|FETCH_HEAD|MERGE_HEAD|[0-9a-f]{7,40}|origin\/.*|upstream\/.*|refs\/.*)$|[~^@:]/;

/** True when `git <sub> <args>` moves or discards work. */
function movesWork({ sub, args }) {
  const flags = args.filter((a) => a.startsWith("-") && a !== "--");
  const dashes = args.indexOf("--");
  const plain = args.filter(
    (a, i) => !a.startsWith("-") && (dashes < 0 || i < dashes),
  );
  if (sub === "stash") return !STASH_READS.has(args[0]);
  if (sub === "checkout")
    return (
      (dashes >= 0 && args.length > dashes + 1) ||
      args.includes(".") ||
      flags.some((f) => f === "-f" || f === "--force")
    );
  if (sub === "restore") {
    const staged = flags.includes("--staged") || flags.includes("-S");
    const worktree = flags.includes("--worktree") || flags.includes("-W");
    const paths = args.filter(
      (a, i) =>
        !a.startsWith("-") && !/^(?:-s|--source)$/.test(args[i - 1] ?? ""),
    );
    return (paths.length > 0 || flags.includes("-p")) && (!staged || worktree);
  }
  if (sub === "reset") {
    if (flags.some((f) => /^--(?:hard|soft|mixed|merge|keep)$/.test(f)))
      return true;
    // `git reset <path>` and `git reset <ref> <path>` change the index only.
    if (dashes >= 0 || plain.length !== 1) return false;
    return REF.test(plain[0]) || !/[./]/.test(plain[0]);
  }
  return false;
}

/** The ask reason for a `Bash` command, or undefined when no git command in it moves or discards work. */
export function gitReason(command) {
  for (const words of commands(command)) {
    for (const inner of nested(words)) {
      const call = gitCall(inner);
      if (call && movesWork(call))
        return `The command \`git ${call.sub}\` moves or discards work.
The user and other sessions share this working tree, so a stash, a reset, or a restore can remove changes that are not yours.
Ask the user first, or use a command that leaves the work in place.`;
    }
  }
  return undefined;
}

/** `words` and, for `sh -c '...'`, the commands in the script text. */
function nested(words) {
  const shell = /^(?:ba|z|da)?sh$/.test(words[0]?.replace(/^.*\//, "") ?? "");
  const at = words.indexOf("-c");
  if (!shell || at < 0 || !words[at + 1]) return [words];
  return [words, ...commands(words[at + 1])];
}
