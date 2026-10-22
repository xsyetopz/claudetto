// The cleanup at session start (spec `session-hygiene`, D12 of change `0-3-0`).
// One `sh` script does the work, so a test runs the same script on a fake tree.
// The script prints one line for each result, and `parseCleanup` reads them.
// Every rule is here: the script removes a folder only when no file of the sessions folder names its session and it is older than `days`.

/** Where the script works. `tmp` is the temp folder of Claude Code, `sessions` is `~/.claude/sessions/`, and `worktrees` is `<project>/.claude/worktrees/`. */
export interface CleanupRoots {
  readonly tmp: string;
  readonly sessions: string;
  readonly worktrees: string;
  /** The age in days over which a folder is old (`cleanupPeriodDays`). */
  readonly days: number;
  /** The id of this session, which is live whatever the sessions folder holds. */
  readonly current: string;
}

// The positional parameters are `$1` tmp, `$2` sessions, `$3` worktrees, `$4` days, and `$5` current.
// A name of 36 characters in the shape of a UUID is a session id. Any other name is not a session.
// A git-ignored file keeps a worktree, because `git worktree remove` deletes it, such as a `.env`.
// The files in a folder that a tool makes again, such as `node_modules`, keep no work, so `$rebuilt` skips them.
const SCRIPT = String.raw`
tmp=\${1%/}; sess=$2; wt=\${3%/}; days=$4; cur=$5
root="$tmp/claude-$(id -u)"
isid() {
  case $1 in
    *[!0-9a-f-]*) return 1 ;;
    ????????-????-????-????-????????????) return 0 ;;
  esac
  return 1
}
live() {
  [ "$1" = "$cur" ] && return 0
  [ -d "$sess" ] && grep -rqF -- "$1" "$sess" 2>/dev/null
}
old() { [ -n "$(find "$1" -maxdepth 0 -mtime +"$days" 2>/dev/null)" ]; }
bytes() { kb=$(du -sk "$1" 2>/dev/null | cut -f1); echo $(( \${kb:-0} * 1024 )); }
unknown=0
if [ -d "$root" ]; then
  for c in "$root"/*; do
    [ -e "$c" ] || continue
    name=\${c##*/}
    case $name in fswatch-probe-*) continue ;; esac
    known=0
    if [ -d "$c" ]; then
      for s in "$c"/*/; do
        [ -d "$s" ] || continue
        s=\${s%/}; id=\${s##*/}
        isid "$id" || continue
        known=1
        if live "$id" || ! old "$s"; then continue; fi
        b=$(bytes "$s")
        rm -rf "$s" && printf 'dir\t%s\t%s\n' "$b" "$s"
      done
    fi
    [ "$known" = 1 ] || unknown=$((unknown + 1))
  done
fi
for f in "$tmp"/claudetto/*/*.*; do
  [ -f "$f" ] || continue
  n=\${f##*/}; id=\${n%%.*}
  isid "$id" || continue
  if live "$id" || ! old "$f"; then continue; fi
  b=$(bytes "$f")
  rm -f "$f" && printf 'file\t%s\t%s\n' "$b" "$f"
done
keep() { printf 'kept\t%s\t%s\n' "$2" "$1"; }
rebuilt='^!! (.*/)?(node_modules|\.venv|__pycache__|dist|build|target|\.next|coverage)(/|$)'
if [ -d "$wt" ]; then
  for d in "$wt"/*/; do
    d=\${d%/}
    [ -d "$d" ] || continue
    if [ -d "$sess" ] && grep -rqF -e "\"cwd\":\"$d\"" -e "\"cwd\":\"$d/" "$sess" 2>/dev/null; then keep "$d" live; continue; fi
    if ! old "$d"; then keep "$d" young; continue; fi
    git -C "$d" rev-parse --git-dir >/dev/null 2>&1 || { keep "$d" "not a worktree"; continue; }
    if [ -n "$(git -C "$d" status --porcelain --ignored=matching -uall 2>/dev/null | grep -vE "$rebuilt")" ]; then keep "$d" dirty; continue; fi
    ref=$(git -C "$d" symbolic-ref -q HEAD 2>/dev/null)
    own=\${ref#refs/heads/}
    if [ -n "$ref" ]; then
      left=$(git -C "$d" rev-list HEAD --not --exclude="$own" --branches --remotes 2>/dev/null | head -n 1)
    else
      left=$(git -C "$d" rev-list HEAD --not --branches --remotes 2>/dev/null | head -n 1)
    fi
    if [ -n "$left" ]; then keep "$d" unmerged; continue; fi
    common=$(git -C "$d" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
    if git --git-dir="$common" worktree remove "$d" >/dev/null 2>&1; then printf 'worktree\t%s\n' "$d"; else keep "$d" "not removed"; fi
  done
fi
printf 'unknown\t%s\n' "$unknown"
`.replace(/\\\$/g, "$");

export const cleanupArgv = (roots: CleanupRoots): string[] => [
  "sh",
  "-c",
  SCRIPT,
  "sh",
  roots.tmp,
  roots.sessions,
  roots.worktrees,
  String(roots.days),
  roots.current,
];

export interface CleanupReport {
  readonly folders: number;
  readonly bytes: number;
  readonly files: number;
  readonly worktrees: string[];
  readonly kept: { path: string; reason: string }[];
  /** The entries of the temp folder that no rule names. */
  readonly unknown: number;
}

/** The report from the output of the script. A line that it does not know adds nothing. */
export const parseCleanup = (stdout: string): CleanupReport => {
  const report = {
    folders: 0,
    bytes: 0,
    files: 0,
    worktrees: [] as string[],
    kept: [] as { path: string; reason: string }[],
    unknown: 0,
  };
  for (const line of stdout.split("\n")) {
    const [kind = "", a = "", b = ""] = line.split("\t");
    if (kind === "dir" || kind === "file") {
      if (kind === "dir") report.folders++;
      else report.files++;
      report.bytes += Number(a) || 0;
    } else if (kind === "worktree") report.worktrees.push(a);
    else if (kind === "kept") report.kept.push({ path: b, reason: a });
    else if (kind === "unknown") report.unknown = Number(a) || 0;
  }
  return report;
};
