# claudetto-openspec

The OpenSpec workflow for Claude Code: one deferred tool and seven skills over the upstream OpenSpec layout, with no `openspec` binary and no network calls.

## Status

This plugin holds only its manifest. The openspec block is not built over vanilla Claude Code 2.1.327 (OUT-179 to OUT-181 in `plans/rebuild/prd/README.md`), so installing it adds no tool, skill or hook.

## Install

```sh
claude plugin install claudetto-openspec --marketplace xsyetopz/bedrock
```

To disable it, run `/plugin` and turn off claudetto-openspec, or run `claude plugin disable claudetto-openspec`.
