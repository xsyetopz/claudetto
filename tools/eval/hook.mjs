// The scripted user for permission asks. A `PreToolUse` hook in the arm
// settings answers from the case file (design D9). The hook script runs in
// the container with `node`, and reads its rules from a JSON file.

/** The text of the hook script. It has no import, so it runs on its own. */
export const HOOK_SCRIPT = `import fs from "node:fs";
const rules = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const input = JSON.parse(fs.readFileSync(0, "utf8"));
const subject =
  input.tool_name === "Bash"
    ? String(input.tool_input?.command ?? "")
    : String(input.tool_input?.file_path ?? input.tool_input?.path ?? "");
for (const rule of rules) {
  if (rule.tool && rule.tool !== input.tool_name) continue;
  if (!new RegExp(rule.match).test(subject)) continue;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: rule.answer,
      permissionDecisionReason: rule.reason ?? "The case file answers " + rule.answer + ".",
    },
  }));
  break;
}
`;

/** The rules of a case: the asks it answers, `[{tool, match, answer}]`. */
export function hookRules(script) {
  return (script?.asks ?? []).map((a) => ({
    tool: a.tool,
    match: a.match,
    answer: a.answer === "allow" ? "allow" : "deny",
    reason: a.reason,
  }));
}

/** The `hooks` setting that runs the script at `hookPath` with `rulesPath`. */
export function hookSettings(hookPath, rulesPath) {
  return {
    hooks: {
      PreToolUse: [
        {
          matcher: "*",
          hooks: [
            { type: "command", command: `node ${hookPath} ${rulesPath}` },
          ],
        },
      ],
    },
  };
}
