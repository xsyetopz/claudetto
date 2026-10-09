// The unbounded-output deny (spec context-bound, task 18.14) with commands as strings.
// No command runs, and no file is read.

import { expect, test } from "bun:test";
import { boundReason } from "../../plugins/dotclaude/features/reads/advice.mjs";
import { unbounded } from "../../plugins/dotclaude/features/reads/bounds.mjs";
import { decide } from "../../plugins/dotclaude/features/reads/cli.mjs";
import { pipelines } from "../../plugins/dotclaude/features/reads/split.mjs";

const reason = (command) =>
  decide(
    { tool_name: "Bash", cwd: "/work/app", tool_input: { command } },
    () => 100,
  )?.hookSpecificOutput.permissionDecisionReason;

test("a read with no limit names the command that has no limit", () => {
  for (const [command, name] of [
    ["cat design.md | grep D22", "cat"],
    ["jq . runs.json", "jq"],
    ["jq -r '.[] | .case' runs.json | sort", "jq"],
    ["git log", "git log"],
    ["git -C app diff", "git diff"],
    ["rg foo", "rg"],
    ["grep -rn foo src | grep -v test", "grep"],
    ["find . -name '*.mjs'", "find"],
    ["ls -R src", "ls -R"],
    ["curl -s https://x.test | jq '.items[]'", "curl"],
    ["find . | xargs grep foo", "grep"],
    ["sed 's/a/b/' design.md", "sed"],
    ["for f in a b; do cat $f; done", "cat"],
    ["(cd app && cat design.md)", "cat"],
    ["cat design.md 2>&1", "cat"],
    ["timeout 5 env A=1 jq . f.json", "jq"],
  ])
    expect([command, unbounded(command)]).toEqual([command, name]);
});

test("a bound at the end of the pipe, a count or list flag, or a range is allowed", () => {
  for (const command of [
    "jq . runs.json | head -n 20",
    "find . -name '*.mjs' | wc -l",
    "git log --oneline -n 20",
    "git log -3",
    "git diff --stat",
    "git show HEAD --name-only",
    "git blame -L 10,20 a.mjs",
    "rg -l foo",
    "grep -c foo design.md",
    "grep -rm5 foo src",
    "sed -n '40,80p' design.md",
    "sed -n '285,289p;293,300p' tasks.md",
    'for l in 1 2; do sed -n "${l}p" f; done',
    "awk '{print $1}' f | sort | uniq -c | sort -rn | head",
    "find . | xargs grep -l foo",
    "diff -q a b",
    "curl -sS -o page.html https://x.test",
    "xxd -l 64 a.bin",
  ])
    expect([command, unbounded(command)]).toEqual([command, null]);
});

test("output to a file, a heredoc, and a command that is not a read are allowed", () => {
  for (const command of [
    "cat design.md > copy.md",
    "jq -e . f.json >/dev/null",
    "cat <<'EOF' > notes.md\nfind the cause\ngrep it\nEOF",
    'jq . <<<"$x"',
    "bun test 2>&1 | grep -E 'pass|fail'",
    "ps aux | grep node",
    "git status --short",
    "ls -la",
    "sed -i '' 's/a/b/' f",
    "echo done",
  ])
    expect([command, unbounded(command)]).toEqual([command, null]);
});

test("the body of a heredoc in a quoted substitution is not read as commands", () => {
  const commit = `git commit -m "$(cat <<'EOF'
find the cause (design "D22")
cat the log
EOF
)"`;
  expect(unbounded(commit)).toBeNull();
  // The command after the heredoc is read.
  expect(unbounded("python3 - <<'EOF'\nprint(1)\nEOF\ngrep -n x f.mjs")).toBe(
    "grep",
  );
});

test("the split keeps quotes and substitutions in a stage", () => {
  expect(pipelines("grep 'a|b' f | head; echo \"x && y\" && ls")).toEqual([
    ["grep 'a|b' f", "head"],
    ['echo "x && y"'],
    ["ls"],
  ]);
  expect(pipelines("cmd > out 2>&1 &\necho ok")).toEqual([
    ["cmd > out 2>&1"],
    ["echo ok"],
  ]);
});

test("the hook denies a read with no limit and gives the reason", () => {
  expect(reason("cat design.md | grep D22")).toBe(boundReason("cat"));
  expect(reason("jq . f.json | head -5")).toBeUndefined();
  // A file print keeps the reason of the print rule, which differs from the bound reason.
  expect(reason("cat design.md")).toBeDefined();
  expect(reason("cat design.md")).not.toBe(boundReason("cat"));
});

// The cases of the review of 2026-10-09: each was a false deny or a missed deny of the first version.
test("a one-value `jq` filter, a bounded group, and `find -exec` with no read are allowed", () => {
  for (const command of [
    "jq -r .version package.json",
    "jq length f.json",
    "curl -s https://x.test | jq .tag_name",
    "jq '.[0:5]' f.json",
    "find . -type f -exec chmod 644 {} +",
    "find . -name x -exec grep -l y {} +",
    "(cat a; cat b) | head",
    "{ cat a; cat b; } | head -n 5",
    "for f in *.mjs; do cat $f; done | head -n 20",
    'while read f; do grep x "$f"; done < list | head',
    "if true; then cat f; fi > out",
    "cat > f <<\\EOF\ncat x | grep y\nEOF",
    "grep x f>out",
    "cat a b>c",
    "sed -n '$p' f",
    "awk 'END{print NR}' f",
    "git -P log -5",
  ])
    expect([command, unbounded(command)]).toEqual([command, null]);
});

test("an option that does not bound the output does not count as a bound", () => {
  for (const [command, name] of [
    ["git log --stat", "git log"],
    ["git --git-dir .git log", "git log"],
    ["rg --files", "rg"],
    ["od -c f.bin", "od"],
    ["jq '.[] | .case' runs.json", "jq"],
    ["x=$((a<<b))\ncat f", "cat"],
    ["grep '>' f", "grep"],
    ["cat > f <<\\EOF\nhi\nEOF\ncat g", "cat"],
  ])
    expect([command, unbounded(command)]).toEqual([command, name]);
});
