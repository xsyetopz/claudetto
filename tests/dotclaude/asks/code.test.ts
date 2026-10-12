// The git ask and the write ask of the `adherence` hooks for code in another language, which a program such as `python3` or `node` runs.
// The guards read the words of the code, with no parser for its language.
// Commands are strings. No command runs and no file is read.

import { expect, test } from "bun:test";
import type { Verdict } from "./verdicts.ts";
import { decideAsk as decide } from "./verdicts.ts";

/** The `hookSpecificOutput` of an ask, as `decide` gives it. */
type Ask = Verdict["hookSpecificOutput"];

/** The `hookSpecificOutput` fields that the `ask` tests read. */

const NO_IO = { read: async () => null };
const out = async (command: string): Promise<Ask | undefined> =>
  (
    await decide(
      { tool_name: "Bash", cwd: "/w", tool_input: { command } },
      {},
      NO_IO,
    )
  )?.hookSpecificOutput;

test("a git command in code of any language gets the git ask", async () => {
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
    const o = await out(command);
    expect(o?.permissionDecision, command).toBe("ask");
    expect(o?.permissionDecisionReason).toMatch(
      /`git (?:stash|reset|checkout)`/,
    );
  }
});

test("a protected path in code of any language gets the write ask", async () => {
  const cases: [string, string][] = [
    [
      "python3 - <<'EOF'\nopen('tests/a.test.mjs','w').write('')\nEOF",
      "tests/a.test.mjs",
    ],
    [`node -e "require('fs').writeFileSync('biome.json','{}')"`, "biome.json"],
    [
      `python3 -c "import os; os.system('sed -i s/a/b/ tests/a.test.mjs')"`,
      "tests/a.test.mjs",
    ],
  ];
  for (const [command, file] of cases) {
    const o = await out(command);
    expect(o?.permissionDecision, command).toBe("ask");
    expect(
      o?.permissionDecisionReason?.includes(`\`${file}\``),
      command,
    ).toBeTruthy();
  }
});

const CI_FILE = ".github/workflows/check.yml";

test("code that only names a path, with no write word, gets no ask", async () => {
  for (const command of [
    `ruby -ryaml -e 'YAML.load_file("${CI_FILE}"); puts "yaml ok"'`,
    `python3 -c 'import json; json.load(open("${CI_FILE}"))'`,
    `node -e "console.log(require('fs').readFileSync('${CI_FILE}', 'utf8'))"`,
    `perl -ne 'print if /on:/' ${CI_FILE}`,
  ])
    expect(await out(command), command).toBe(undefined);
});

test("code that writes a path through its own file API gets the write ask", async () => {
  for (const command of [
    `ruby -e 'File.write("${CI_FILE}", "x")'`,
    `python3 -c 'open("${CI_FILE}","w").write("x")'`,
    `node -e 'require("fs").writeFileSync("${CI_FILE}", "x")'`,
    `node -e 'require("fs").rmSync("${CI_FILE}")'`,
    `python3 -c 'import os; os.remove("${CI_FILE}")'`,
    `ruby -e 'File.open("${CI_FILE}", "a") { |f| f.puts 1 }'`,
    `perl -e 'open(F, ">${CI_FILE}")'`,
    `awk 'BEGIN { print "x" > "${CI_FILE}" }'`,
  ]) {
    const o = await out(command);
    expect(o?.permissionDecision, command).toBe("ask");
    expect(
      o?.permissionDecisionReason?.includes(`\`${CI_FILE}\``),
      command,
    ).toBeTruthy();
  }
});

test("text that no program runs as code gets no ask", async () => {
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
    expect(await out(command), command).toBe(undefined);
});
