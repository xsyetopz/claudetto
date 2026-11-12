// Live probe: one session edits a.ts in a scratch repo with claudetto loaded; the slice block should make it commit.
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env))
	if (
		v !== undefined &&
		!/^(CLAUDECODE|AI_AGENT|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AUTOCOMPACT_PCT_OVERRIDE|CLAUDE_CODE_(?!OAUTH_TOKEN))/.test(
			k,
		)
	)
		env[k] = v;
Object.assign(env, {
	CLAUDE_CONFIG_DIR: "/tmp/probe-122/cfg",
	DISABLE_TELEMETRY: "1",
	DISABLE_ERROR_REPORTING: "1",
	DISABLE_AUTOUPDATER: "1",
	GIT_CONFIG_COUNT: "3",
	GIT_CONFIG_KEY_0: "commit.gpgsign",
	GIT_CONFIG_VALUE_0: "false",
	GIT_CONFIG_KEY_1: "user.name",
	GIT_CONFIG_VALUE_1: "probe",
	GIT_CONFIG_KEY_2: "user.email",
	GIT_CONFIG_VALUE_2: "probe@example.invalid",
});
const p = Bun.spawn(
	[
		"claude",
		"-p",
		"In a.ts, change the 1 to 2.",
		"--model",
		"haiku",
		"--plugin-dir",
		"/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto",
		"--setting-sources",
		"",
		"--permission-mode",
		"acceptEdits",
		"--allowedTools",
		"Bash(git add:*),Bash(git commit:*),Bash(git status:*),Bash(git diff:*)",
		"--no-session-persistence",
		"--max-budget-usd",
		"0.5",
		"--debug-file",
		"/tmp/probe-148/debug.log",
		"--output-format",
		"json",
	],
	{
		cwd: "/tmp/probe-148/repo",
		env,
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	},
);
const out = await new Response(p.stdout).text();
await p.exited;
const j = JSON.parse(out);
console.log(
	"usd",
	j.total_cost_usd,
	"turns",
	j.num_turns,
	"\n",
	String(j.result).slice(0, 600),
);
