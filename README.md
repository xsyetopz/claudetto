# Claudetto

Claude Code 2.1.329 plugins that keep only what measurably beats vanilla Claude Code.

| Plugin | What it does |
| --- | --- |
| [claudetto](plugins/claudetto/README.md) | Turns off the bundled builtin plugins, writes a handover in place of compaction, and keeps prompt caching warm. |
| [claudetto-spec](plugins/claudetto-spec/README.md) | Spec-first loop: requirement IDs that tests cite, failing tests before code, and a `spec_check` coverage tool. |
| [claudetto-you-should-know](plugins/claudetto-you-should-know/README.md) | Shows a short note above the prompt when a session did something you are likely to miss. |

## Install

```sh
claude plugin marketplace add xsyetopz/claudetto
claude plugin install claudetto@claudetto
```

Install `claudetto-spec@claudetto` and `claudetto-you-should-know@claudetto` the same way.

## License

[MIT](LICENSE)
