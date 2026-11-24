// Probe on vanilla claude: can a plugin's session.start hook run /reload-plugins itself in an
// interactive session? Starts claude in a tmux session (a terminal) with the plugin in this folder's
// `plugin/`, which writes each $.command.run outcome to $OUT, or with PLUGIN=<dir> that plugin.
// Usage: OUT=<file> [PLUGIN=<dir>] bun probe.ts; the screen is kept in <tmp>/screen.txt.
// Bills nothing: every request goes to 127.0.0.1.
import { startFakeApi } from "../../../../tools/measure-tools/fake-api";

// The trust key is the resolved path: /var is a link to /private/var on macOS.
const dir = (
	await Bun.$`realpath ${(await Bun.$`mktemp -d`.text()).trim()}`.text()
).trim();
const cfg = `${dir}/cfg`;
const key = "sk-ant-fake-probe-key-0001";
await Bun.write(
	`${cfg}/.claude.json`,
	JSON.stringify({
		hasCompletedOnboarding: true,
		customApiKeyResponses: { approved: [key.slice(-20)], rejected: [] },
		projects: { [dir]: { hasTrustDialogAccepted: true } }
	})
);
const api = startFakeApi(false);
// tmux gives claude a terminal, so the session is interactive.
const name = `reload-probe-${process.pid}`;
const vars = `CLAUDE_CONFIG_DIR=${cfg} ANTHROPIC_BASE_URL=${api.url} ANTHROPIC_API_KEY=${key} OUT=${process.env["OUT"]}`;
await Bun.$`tmux new-session -d -s ${name} -x 200 -y 50 -c ${dir} ${`env ${vars} claude --plugin-dir ${process.env["PLUGIN"] ?? `${import.meta.dir}/plugin`}`}`;
await Bun.sleep(15_000);
await Bun.$`tmux capture-pane -p -t ${name} > ${dir}/screen.txt`;
await Bun.$`tmux kill-session -t ${name}`;
await api.stop();
console.log(dir);
console.log(
	await Bun.file(process.env["OUT"] ?? "")
		.text()
		.catch(() => "(no log)")
);
