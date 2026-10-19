# Mod API: The `claude-code/testing` Module

`claude-code/testing` is the test kit that `*.test.ts` and `*.test.tsx` files import.
`claude plugin test` runs those files with no session, no sign-in, and no network.
This test fires two tool calls and checks that `/tally` counts both:

```typescript
import { expect, test } from 'claude-code/testing'

test('/tally reports the tool calls the mod has seen', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }))
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await $.tool.call({ tool: 'Read', file_path: 'README.md' })
  const answer = await $.command.run({ command: 'tally', args: '' })
  expect(answer.text).toBe('Claude has made 2 tool calls since this mod loaded')
})
```

A test runs in an environment like that of a hook, with no files, no network, and no process.
Each test ends after 5 seconds unless it sets `timeoutMs`.
A hooks module in a session cannot import this module.

## Exports

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `test(name, body)` | Declares one test. `body` is `async ($, on) => {}`. | `$` is the engine's own, loaded from the plugin folder by the engine host. The hooks that `on` registers sit beneath every plugin. Default timeout 5 seconds, set `timeoutMs` to change it. | A `*.test.ts` or `*.test.tsx` file under `claude plugin test <dir>`. | `test` line 16648, [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference) |
| ✅ | `describe(name, body)` | Groups tests. Its name leads the title of each test inside. | The body runs at once, while the file loads. | Test files. | `describe` line 15624 |
| ✅ | `expect(received, message?)` | Assertions: `Matchers` (the `toBe` family), `AsyncMatchers`, `Negatable` (`not`), and the asymmetric matchers `expect.any`, `expect.objectContaining`. | Typed by `Expect`, `Expectation`, `Matchers`, `Matching`. | Test files. | `Expect` line 15870 |
| ✅ | `tier(tier)` | Sets the tier that the plugin under test loads in. `PluginTier` excludes `core`. | Call before the tests. | Test files. | `PluginTier` line 16581 |
| ✅ | `mock` | Memory-backed answers for the nouns beneath the plugins: clock, store, env, session, and more. | `MockClock`, `MockSession`, and options are typed in the testing module. | Test files. | `Mock` line 16157 |
| ✅ | `$.ui.mount(...)` | Draws a component through the plugin on the surface that the test names and returns a handle to read and act on by key. | Surfaces: `terminal`, `desktop`, `vscode`, `mobile`. The handle finds, presses, types, selects, resizes, and unmounts. It tests the mod, not the paint. | Tests only. | `Mounted` line 16291, [Mods Overview](https://code.claude.com/docs/en/plugins/mods/overview) |

## See Also

- [Mod API: Testing Types](Claude-Code-Mod-API-Testing-Types)
- [Claude Code Mod API](Claude-Code-Mod-API)
- [Test a Mod](https://code.claude.com/docs/en/plugins/mods/test)
