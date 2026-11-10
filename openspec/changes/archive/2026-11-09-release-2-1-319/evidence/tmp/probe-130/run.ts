// H: under claudetto's shipped sandbox block, an SSH-signed commit works. P: verify prints "Good \"git\" signature".
import {
	applyChanges,
	changesOf,
	GROUPS,
	valueAt,
} from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/setup/settings.ts";
let s: any = {};
for (const g of GROUPS) s = applyChanges(s, changesOf(s, g), "replace");
const sandbox = valueAt(s, ["sandbox"]);
await Bun.write("/tmp/probe-130/settings.json", JSON.stringify({ sandbox }));
const repo = "/tmp/probe-130/repo";
const cmd = `cd ${repo} && git -c user.name=t -c user.email=t@t -c commit.gpgsign=true -c gpg.format=ssh -c user.signingkey=$HOME/.ssh/id_ed25519.pub commit -q --allow-empty -m probe && git -c gpg.ssh.allowedSignersFile=/dev/null log --show-signature -1 2>&1 | head -3; echo EXIT=$?`;
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env))
	if (
		v !== undefined &&
		!/^(CLAUDECODE|CLAUDE_PID|CLAUDE_CODE_(?!OAUTH_TOKEN))/.test(k)
	)
		env[k] = v;
const p = Bun.spawn(
	[
		"claude",
		"-p",
		`Run this exact Bash command once, unchanged, and reply with its output only:\n${cmd}`,
		"--model",
		"haiku",
		"--settings",
		"/tmp/probe-130/settings.json",
		"--setting-sources",
		"",
		"--allowedTools",
		"Bash",
		"--no-session-persistence",
		"--debug-file",
		"/tmp/probe-130/debug.log",
		"--max-budget-usd",
		"0.2",
	],
	{
		cwd: "/tmp/probe-130",
		env: { ...env, DISABLE_TELEMETRY: "1" },
		stdout: "pipe",
		stderr: "pipe",
	},
);
console.log(
	await new Response(p.stdout).text(),
	await new Response(p.stderr).text(),
);
