# Lab Capture

The command `claudetto-capture` of the plugin `claudetto-lab` is a local proxy for Claude Code.
It logs each request and sizes the parts of the first request that has tools.
Read this page if you need to see which part of a request costs the most tokens.

## Run the Proxy

```text
claudetto-capture [--port 8787] [--out DIR] [--upstream URL] [--no-count]
ANTHROPIC_BASE_URL=http://127.0.0.1:8787 ENABLE_TOOL_SEARCH=true claude
```

The proxy listens on `127.0.0.1` and forwards each request to the upstream.
It writes the body of each `/v1/messages` request to `DIR/request-<run>-<n>.jsonl`, as one JSON line.
The default folder is `claudetto-capture` in the temp folder.
The default port is 8787.
`--port` takes a whole number from 1 to 65535, and another value exits 2 with a message.
`just capture` runs the proxy from the repository.

## Upstream

The proxy takes the upstream from the first of these sources that is set:

1. The `--upstream` flag.
2. `ANTHROPIC_BASE_URL`.
3. `https://api.anthropic.com`.

The proxy refuses an upstream that is not a valid URL.
It also refuses an upstream that is its own address, because the requests would loop.
The check looks at the hosts `127.0.0.1`, `localhost`, and `[::1]` with the port of the proxy.
Both refusals exit 1.

## Credentials

- The proxy never writes a request header, because the headers carry the credential.
- The proxy sends upstream only the headers that match a fixed list: `authorization`, `x-api-key`, `anthropic-*`, `content-type`, `user-agent`, `x-app`, and `x-stainless-*`.
- An error text of a `count_tokens` call has each credential value of the request replaced by `[redacted]`, also when the upstream echoes it.

## Sizing

The proxy sizes the first `/v1/messages` request that has tools.
It uses the `count_tokens` endpoint and the credential of that request.

1. It counts the full request.
2. It counts the request without one tool, one block, or one section of a long text.
   The difference is the token cost of that part, with its wrapper.
3. It prints the parts from the largest to the smallest, and the rest that no part holds.

The report goes to `DIR/report-<run>-<n>.jsonl` and to standard output.
`--no-count` turns the sizing off.
A body that is not JSON is forwarded unchanged, and the proxy does not save or size it.

If the full count fails, the proxy retries it with fixes, in this order:
`no thinking`, then `system messages as user text`.
The report lists the fixes that it used.

A `count_tokens` reply with no whole `input_tokens` is an error.
The report shows the part as not counted, and it never shows `NaN`.

## Bounds

The bounds are in `slices/capture/limits.ts`.

| Bound | Value | Use |
| --- | --- | --- |
| `SPLIT_CHARS` | 2000 characters | A longer text is sized by section |
| `MAX_PART_COUNTS` | 64 parts | The parts past it get no count, and the report notes it |
| `COUNT_ATTEMPTS` | 4 attempts | A `count_tokens` call that gets HTTP 429 is retried |
| `COUNT_BACKOFF_MS` | 500 ms | The wait before the second attempt, doubled before each later attempt |

## Related Pages

- [Lab](Lab): the other commands of the plugin.
- [Add-Ons](Add-Ons): the list of the add-on plugins.
