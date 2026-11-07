# Interactive runs against the fake Messages API

Each folder is one `claude` TUI run with no paid tokens. Each kept only what its claim needs:
- `requests/plan.json`: the fake API's scripted replies.
- `requests/*.meta.json`: one per request the fake received.
- `settings.json` or `config/settings.json`: the run's settings.
- `config/history.jsonl`: the prompts typed.
- `*.tty.txt`: the pane capture.

Request bodies are left out because they hold the whole system prompt. Where a claim rests on a tool result, that result is
extracted into `requests/0002.tool_results.json`. The `ANTHROPIC_API_KEY` in each pane's spawn line was a fixed fake literal
from the probe script, sent only to the local fake. It reads `<fake key>` here.

| Run | Task | What it shows |
| --- | --- | --- |
| `20261106-123435-07e67d`, `-123441-90fc10`, `-123445-709a41` | 2.1a | the panes `viamod`, `control` and `none`: each shows the prompt, no start dialog |
| `20261106-131021-70bfd2` | 11.6 | `/claudetto:setup` wrote the Sandbox group: `config/settings.json` |
| `20261106-131327-b8ba3c` | 11.6 | `touch ~/sandbox-test-r3607` with the plugin loaded: `Operation not permitted` |
| `20261106-131234-64c099` | 11.6 | the same refusal for `~/sandbox-test-r3554` while the hooks module failed to load (`load-failure.txt`) |
| `20261106-131202-c796d5` | 11.6 | `echo x > ~/sandbox-test-r3522` denied by the gate before it reached the sandbox |
| `20261106-131528-67882f` | 14.4 | `/goal`, a handoff tool call, then `/goal` again |
| `20261106-145018-9c30a3` | 5.7 | the handover fork and its handoff file at a 5,000-token threshold: `debug-excerpt.txt` |
