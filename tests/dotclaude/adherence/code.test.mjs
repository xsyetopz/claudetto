// The git ask and the write ask of the `adherence` hooks for code in another language, which a program such as `python3` or `node` runs.
// The guards read the words of the code, with no parser for its language.
// Commands are strings. No command runs and no file is read.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../../../plugins/dotclaude/features/adherence/cli.mjs";

const NO_IO = { read: () => null, exists: () => false, transcript: () => null };
const out = (command) =>
  decide({ tool_name: "Bash", cwd: "/w", tool_input: { command } }, {}, NO_IO)
    ?.hookSpecificOutput;

test("a git command in code of any language gets the git ask", () => {
  for (const command of [
    "python3 - <<'EOF'\nimport os\nos.system('git stash')\nEOF",
    `python3 - <<'EOF'\nimport subprocess\nsubprocess.run(["git", "reset", "--hard"])\nEOF`,
    `node -e "require('child_process').execSync('git stash')"`,
    `ruby -e 'system("git", "stash")'`,
    "perl -e 'qx(git checkout -- src/a.js)'",
    `deno eval 'Deno.run({cmd:["git","stash"]})'`,
    `awk 'BEGIN{system("git stash")}'`,
    `osascript -e 'do shell script "git stash"'`,
    `python3 <<< 'import os; os.system("git stash")'`,
    "cat <<'EOF' | python3\nimport os; os.system('git stash')\nEOF",
    `cat > /tmp/x.py <<'EOF'\nimport os; os.system("git stash")\nEOF\npython3 /tmp/x.py`,
  ]) {
    const o = out(command);
    assert.equal(o?.permissionDecision, "ask", command);
    assert.match(o.permissionDecisionReason, /`git (?:stash|reset|checkout)`/);
  }
});

test("a protected path in code of any language gets the write ask", () => {
  for (const [command, file] of [
    [
      "python3 - <<'EOF'\nopen('tests/a.test.mjs','w').write('')\nEOF",
      "tests/a.test.mjs",
    ],
    [`node -e "require('fs').writeFileSync('biome.json','{}')"`, "biome.json"],
    [
      `python3 -c "import os; os.system('sed -i s/a/b/ tests/a.test.mjs')"`,
      "tests/a.test.mjs",
    ],
  ]) {
    const o = out(command);
    assert.equal(o?.permissionDecision, "ask", command);
    assert.ok(o.permissionDecisionReason.includes(`\`${file}\``), command);
  }
});

test("text that no program runs as code gets no ask", () => {
  for (const command of [
    "cat > notes.md <<'EOF'\nRun git stash, and see tests/a.test.mjs.\nEOF",
    "git commit -F - <<'EOF'\nDo not git stash.\nEOF",
    "gh pr create --body-file - <<'EOF'\ngit stash is risky\nEOF",
    "cat > /tmp/body.md <<'EOF'\nsee tests/a.test.mjs\nEOF\ngh pr create --body-file /tmp/body.md",
    "rg 'git stash' docs/",
    "echo 'git stash'",
    "python3 -c 'print(1 + 1)'",
    "python3 - <<'EOF'\nprint('hi')\nEOF",
    "node --test tests/a.test.mjs",
    "npx biome check --config-path=biome.json",
  ])
    assert.equal(out(command), undefined, command);
});
