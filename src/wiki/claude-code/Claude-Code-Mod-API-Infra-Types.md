# Mod API: Files, State, Clock, HTTP, Process, and Settings Types

These are the types behind `$.fs`, `$.store`, `$.state`, `$.clock`, `$.http`, `$.process`, `$.env`, and `$.settings`.
They describe files, stored values, timers, web requests, child processes, and settings.
Example: `const { exitCode, stdout } = await $.process.run(["git", "status"])`.

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `Atom` | A named value with its initial, as `atom(ref, initial)` makes it: read, it is never `undefined`, while nothing is written it reads as the initial. | Object with fields `ref`, `initial`, `shape?`. Plain frozen data, the plugin's own: pass it to `read`, `update`, `derive` and `memberOf`. The engine knows nothing of it. | d.ts line 714 |
| ✅ | `Atom.ref` | A field of `Atom`. | Type: `StateAddress`. | d.ts line 714 |
| ✅ | `Atom.initial` | A field of `Atom`. | Type: `T`. | d.ts line 714 |
| ✅ | `Atom.shape` | The tag the value is kept under, when the atom was given one: a stored value under another tag reads as absent (Shaped). | Type: `string`. Optional. | d.ts line 714 |
| ✅ | `AtomFunction` | `atom(ref, initial)`: a named value with its initial, so a read is never `undefined`, given `{ shape }`, for a key declared `Shaped<T>`. | Alias of the call form of `atom`. Pure: it builds a frozen description and calls nothing. Example: `atom({ plugin: "counter", key: "count" } as const, 0)`. | d.ts line 734 |
| ✅ | `AtomOptions` | The options of `atom`: `shape`, a tag the value is kept under, so a reload of the plugin's code that names another tag finds the value absent. | Object with fields `shape`. Bump it when the code's idea of the value changed, the engine keeps whole what the old code wrote, and the tag is how the new code declines it. | d.ts line 746 |
| ✅ | `AtomOptions.shape` | A field of `AtomOptions`. | Type: `string`. | d.ts line 746 |
| ✅ | `ClockWait` | The argument of the `$.clock` waits (`sleep`, `after`, `every`): how long, in milliseconds, before the dispatch resolves. | Object with fields `ms`. Used by `clock.sleep`, `clock.after`, `clock.every`. | d.ts line 1643 |
| ✅ | `ClockWait.ms` | The wait, a non-negative number of milliseconds. | Type: `number`. | d.ts line 1643 |
| ✅ | `Derived` | A value computed from other values, as `derive(sources, fn)` makes it: `read` runs `fn` again only when a source's version moved. | Object with fields `sources`, `compute`. It holds nothing on the host: the cache is the plugin's own, lost with a reload of its code, and rebuilt by the next read. | d.ts line 3812 |
| ✅ | `Derived.sources` | The atoms and references it is computed from, read in this order. | Type: `readonly (Atom<unknown> \| StateAddress)[]`. | d.ts line 3812 |
| ✅ | `Derived.compute` | The function over the sources' values, in the order they were given. | Type: `(...values: never[]) => T`. | d.ts line 3812 |
| ✅ | `DeriveFunction` | `derive(sources, fn)`: a value computed from atoms and references, cached by their versions: `read` runs `fn` again only when one moved. | Alias of `(sources, compute) => Derived<T>`. Pure: it builds a description. Reading it while drawing subscribes the drawing to every source. | d.ts line 3833 |
| ✅ | `EnvSetResult` | What `$.env.set` resolves to and what an `env.set` hook's `{ value }` holds: `{}` once the variable is set or unset, or why it was not. | Object with fields `deny?`. Used by `$.env.set`, `env.set`. | d.ts line 4823 |
| ✅ | `EnvSetResult.deny` | Absent when the write was made, else why not, in one line. | Type: `string`. Optional. In a session that takes settings from its organization, the engine holds a write by a plugin that is not built in. A hook's own `{ deny }` rejects the caller. | d.ts line 4823 |
| ✅ | `FsAncestor` | One file `$.fs.ancestors` found: the directory it stands in, the name it was asked for by, and its text as the engine's memory loader reads it. | Object with fields `dir`, `name`, `content`, `parts`. Used by `$.fs.ancestors`, `fs.ancestors`. | d.ts line 4974 |
| ✅ | `FsAncestor.dir` | The directory the file stands in, absolute. | Type: `string`. | d.ts line 4974 |
| ✅ | `FsAncestor.name` | The spelling the caller asked for it by. | Type: `string`. | d.ts line 4974 |
| ✅ | `FsAncestor.content` | The file's text, with what its `@include`s bring after it. | Type: `string`. | d.ts line 4974 |
| ✅ | `FsAncestor.parts` | The file and then each file its `@` imports brought, in load order, path and text apiece, `content` is these texts joined. | Type: `readonly FsAncestorPart[]`. | d.ts line 4974 |
| ✅ | `FsAncestorPart` | One file of an ancestor entry: the file itself or one it imported. | Object with fields `path`, `content`. | d.ts line 4997 |
| ✅ | `FsAncestorPart.path` | The file's path, absolute. | Type: `string`. | d.ts line 4997 |
| ✅ | `FsAncestorPart.content` | Its text as the engine's memory loader reads it. | Type: `string`. | d.ts line 4997 |
| ✅ | `FsAncestorsRequest` | The argument of `$.fs.ancestors`: the file names to look for in each directory, the file to walk down to, and the directory to walk beneath. | Object with the fields `names`, `of?`, `below?`. Where a rule limits the session's reads, a file is found only where every name on its path may be read. Used by `$.fs.ancestors`, `fs.ancestors`. | d.ts line 5016 |
| ✅ | `FsAncestorsRequest.names` | Relative `.md` file names, each looked for in every directory. | Type: `readonly string[]`. | d.ts line 5016 |
| ✅ | `FsAncestorsRequest.of` | The file the walk goes on down to the directory of, relative to the working directory or absolute, absent, it ends at the working directory. | Type: `string`. Optional. The file to walk down to. Without `below`, a plain name or one under `.claude` is judged as the start-up load is. With no file bound the call rejects. | d.ts line 5016 |
| ✅ | `FsAncestorsRequest.below` | The directory the walk starts beneath, relative to the working directory or absolute, absent, the walk starts at the filesystem root. | Type: `string`. Optional. The directory the walk stays inside. Only directories strictly inside it are read. | d.ts line 5016 |
| ✅ | `FsBytes` | What `$.fs.read(path, { as: "bytes" })` resolves with: the file's bytes, base64, since only plain data crosses into a plugin's environment. | Object with fields `base64`. Used by `fs.read`. | d.ts line 5045 |
| ✅ | `FsBytes.base64` | The file's content, standard padded base64, `Uint8Array.fromBase64(base64)` gives the bytes back. | Type: `string`. | d.ts line 5045 |
| ✅ | `FsEntry` | One entry of `$.fs.list`: the entry itself, a link not followed. | Object with fields `name`, `kind`, `size`, `mtimeMs`, `isLink`. Used by `$.fs.list`, `fs.list`. | d.ts line 5056 |
| ✅ | `FsEntry.name` | The entry's name (no directory part). | Type: `string`. | d.ts line 5056 |
| ✅ | `FsEntry.kind` | `file`, `dir`, or `other`, of the entry itself: a symbolic link is `other` (`$.fs.stat` says what it leads to, and with `resolve` where). | Type: `'file' \| 'dir' \| 'other'`. | d.ts line 5056 |
| ✅ | `FsEntry.size` | Bytes, for a file. | Type: `number`. | d.ts line 5056 |
| ✅ | `FsEntry.mtimeMs` | Last modification, milliseconds since the epoch, for a file, as `$.fs.stat` spells it, 0 for a directory, a link or any other kind. | Type: `number`. A listing reads the size and time of regular files only. `$.fs.stat` answers for a directory. | d.ts line 5056 |
| ✅ | `FsEntry.isLink` | True when the entry is a symbolic link. | Type: `boolean`. | d.ts line 5056 |
| ✅ | `FsReadAs` | How `$.fs.read` answers: `text` (UTF-8, the default) or `bytes` (base64). | Alias of `'text' \| 'bytes'`. Used by `fs.read`. | d.ts line 5090 |
| ✅ | `FsReadBytesOptions` | The options of `$.fs.read` that ask for the bytes: the call answers `{ base64 }`. | Object with fields `as`. | d.ts line 5096 |
| ✅ | `FsReadBytesOptions.as` | `bytes`. | Type: `'bytes'`. | d.ts line 5096 |
| ✅ | `FsReadCall` | `$.fs.read`: the file's text, or with `{ as: "bytes" }` its bytes as `{ base64 }`. | Alias of `{ (path: string): Promise<string>, (path: string, options: FsReadBytesOptions): Promise<FsBytes>, (path: string, options: FsReadOptions): Promise<string \| FsBytes>, }`. Used by `$.fs.read`. | d.ts line 5107 |
| ✅ | `FsReadOptions` | The options of `$.fs.read`. | Object with fields `as`. | d.ts line 5116 |
| ✅ | `FsReadOptions.as` | `bytes` answers `{ base64 }` for a binary file, `text` (the default) the file's text. | Type: `FsReadAs`. | d.ts line 5116 |
| ✅ | `FsStat` | What `$.fs.stat` resolves with: what the path leads to, whether the path itself is a symbolic link, and where it lands when asked. | Object with fields `kind`, `size`, `mtimeMs`, `isLink`, `realPath?`. Used by `$.fs.stat`, `fs.stat`. | d.ts line 5128 |
| ✅ | `FsStat.kind` | `file`, `dir`, or `other`, of what the path leads to: a link is followed, and one that leads nowhere is `other`. | Type: `'file' \| 'dir' \| 'other'`. | d.ts line 5128 |
| ✅ | `FsStat.size` | Bytes, for a file. | Type: `number`. | d.ts line 5128 |
| ✅ | `FsStat.mtimeMs` | Last modification, milliseconds since the epoch. | Type: `number`. | d.ts line 5128 |
| ✅ | `FsStat.isLink` | True when the path itself is a symbolic link, `kind`, `size` and `mtimeMs` then describe what it points at, or the link when that is gone. | Type: `boolean`. | d.ts line 5128 |
| ✅ | `FsStat.realPath` | Where the path landed when asked with `{ resolve: true }`: absolute, every symbolic link followed, `.` and `..` folded, else absent. | Type: `string`. Optional. Absent when the path leads nowhere or a hook withheld it. A deny-list on spellings is best effort. An allow-list on `realPath` is the robust guard. | d.ts line 5128 |
| ✅ | `FsStatOptions` | The options of `$.fs.stat`. | Object with fields `resolve`. Used by `$.fs.stat`. | d.ts line 5164 |
| ✅ | `FsStatOptions.resolve` | True to resolve where the path lands as well. | Type: `boolean`. The answer then carries `realPath` when the path leads somewhere, at the cost of one more file system call: where it landed then, not a hold on what a tool opens afterwards. | d.ts line 5164 |
| ✅ | `HttpInit` | Options of `$.http.fetch`. | Object with fields `method?`, `headers?`, `body?`, `auth?`, `socketPath?`. Used by `$.http.fetch`, `http.fetch`. | d.ts line 5335 |
| ✅ | `HttpInit.method` | `GET` (default), `POST`, ... | Type: `string`. Optional. | d.ts line 5335 |
| ✅ | `HttpInit.headers` | Request headers. | Type: `Record<string, string>`. Optional. | d.ts line 5335 |
| ✅ | `HttpInit.body` | The request body, as text. | Type: `string`. Optional. | d.ts line 5335 |
| ✅ | `HttpInit.auth` | The handle `$.session.authorize()` answered: the engine sets the session's credential header itself, only for a first-party host. | Type: `string`. Optional. It rides https only. While `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set, a request that carries it is refused, whichever plugin asks. | d.ts line 5335 |
| ✅ | `HttpInit.socketPath` | The absolute path of a Unix domain socket the request goes over instead of TCP (near 100 B at most): one per session, in a private directory. | Type: `string`. Optional. A Unix socket to use instead of TCP. The URL still gives the path, query, and Host. No proxy. No relative path. | d.ts line 5335 |
| ✅ | `HttpResponse` | What `$.http.fetch` resolves with. | Object with fields `status`, `ok`, `headers`, `text`. Used by `$.http.fetch`, `http.fetch`. | d.ts line 5373 |
| ✅ | `HttpResponse.status` | The HTTP status code. | Type: `number`. | d.ts line 5373 |
| ✅ | `HttpResponse.ok` | True for a 2xx status. | Type: `boolean`. | d.ts line 5373 |
| ✅ | `HttpResponse.headers` | Response headers, lower-cased names. | Type: `Record<string, string>`. | d.ts line 5373 |
| ✅ | `HttpResponse.text` | The body, as text. | Type: `string`. | d.ts line 5373 |
| ✅ | `JsonValue` | Plain data: what JSON holds, and what crosses between a plugin's hooks module and its surface module whole (a `Client`'s props, a post's data). | Union. Fields: `[key: string]`. A function, a class instance, `undefined` or a cycle is not plain data, the engine refuses one where it checks, and drops it where it clones. | d.ts line 5740 |
| ✅ | `JsonValue.[key: string]` | A field of `JsonValue`. | Type: `JsonValue`. | d.ts line 5740 |
| ✅ | `MemberOfFunction` | `memberOf(family, e)`: the member of a family for the instance being drawn, keyed by `e.requestId`, of an atom over a family, that member's. | Alias of the call forms of `memberOf`. It picks one member of a state family for a render instance. Example: `read($, memberOf(isOpen, e))`. | d.ts line 6184 |
| ✅ | `ProcessRunInit` | Options of `$.process.run`. | Object with fields `cwd?`, `env?`, `stdin?`, `timeoutMs?`. Used by `$.process.run`, `process.run`. | d.ts line 8162 |
| ✅ | `ProcessRunInit.cwd` | The child's working directory, relative to the session's or absolute, absent, the session's working directory. | Type: `string`. Optional. | d.ts line 8162 |
| ✅ | `ProcessRunInit.env` | Variables set over the host process's own environment. | Type: `Record<string, string>`. Optional. | d.ts line 8162 |
| ✅ | `ProcessRunInit.stdin` | Text written to the child's standard input, then closed. | Type: `string`. Optional. | d.ts line 8162 |
| ✅ | `ProcessRunInit.timeoutMs` | How long the child may run before it is killed and the call rejects, in milliseconds, 30 seconds when absent, ten minutes at most. | Type: `number`. Optional. | d.ts line 8162 |
| ✅ | `ProcessRunResult` | What `$.process.run` resolves with once the child has exited. | Object with fields `exitCode`, `stdout`, `stderr`, `isStdoutTruncated`, `isStderrTruncated`. Example: `const { stdout } = await $.process.run(["git", "log"])`. | d.ts line 8189 |
| ✅ | `ProcessRunResult.exitCode` | The child's exit status, a child ended by a signal reads as 1. | Type: `number`. | d.ts line 8189 |
| ✅ | `ProcessRunResult.stdout` | What the child wrote to standard output, as text: its first 4194304 bytes (4 MiB), the rest read and dropped (`isStdoutTruncated`). | Type: `string`. The limit counts bytes, not characters, and is standard output's own: standard error has the same limit again. A cut inside a multi-byte character drops that character. | d.ts line 8189 |
| ✅ | `ProcessRunResult.stderr` | What the child wrote to standard error, as text: its first 4194304 bytes (4 MiB), the rest read and dropped (`isStderrTruncated`). | Type: `string`. | d.ts line 8189 |
| ✅ | `ProcessRunResult.isStdoutTruncated` | True when the child wrote more than 4194304 bytes to standard output and `stdout` is only the first of them, false when `stdout` is whole. | Type: `boolean`. | d.ts line 8189 |
| ✅ | `ProcessRunResult.isStderrTruncated` | True when the child wrote more than 4194304 bytes to standard error and `stderr` is only the first of them, false when `stderr` is whole. | Type: `boolean`. | d.ts line 8189 |
| ✅ | `ProcessSpawnChunk` | One piece of a spawned child's output as `$.process.spawn` streams it: which pipe it came from, and the text. | Object with the fields `stream`, `text`. The text is UTF-8 decoded as it arrived. A line may span two pieces. A multi-byte character is never split. Used by `$.process.spawn`. | d.ts line 8228 |
| ✅ | `ProcessSpawnChunk.stream` | The pipe the text came from. | Type: `'stdout' \| 'stderr'`. | d.ts line 8228 |
| ✅ | `ProcessSpawnChunk.text` | What the child wrote, decoded, never empty, and never cut. | Type: `string`. Nothing of the stream is dropped: once 1048576 characters wait unread, the child blocks on its next write until the loop pulls. | d.ts line 8228 |
| ✅ | `ProcessSpawnRequest` | The argument of `$.process.spawn(request)`, and the `e` its hooks see: the command by its argument vector and how the child is started. | Object with fields `argv`, `cwd?`, `env?`, `input?`. It follows the rules of `$.process.run`: no shell, the session's working directory by default, and the host's environment with `env` over it. | d.ts line 8249 |
| ✅ | `ProcessSpawnRequest.argv` | The command and its arguments, `argv[0]` the executable. | Type: `readonly string[]`. | d.ts line 8249 |
| ✅ | `ProcessSpawnRequest.cwd` | The child's working directory, relative to the session's or absolute, absent, the session's working directory. | Type: `string`. Optional. | d.ts line 8249 |
| ✅ | `ProcessSpawnRequest.env` | Variables set over the host process's own environment. | Type: `Record<string, string>`. Optional. | d.ts line 8249 |
| ✅ | `ProcessSpawnRequest.input` | Text written to the child's standard input, which is then closed, absent, standard input is closed from the start. | Type: `string`. Optional. A string today, a later form may take the text in pieces. | d.ts line 8249 |
| ✅ | `ProcessSpawnResult` | How a spawned child ended, as the stream of `$.process.spawn` returns it once every piece has been read: its exit code, or the signal that did it. | Object with fields `code`, `signal`. Used by `$.process.spawn`, `process.spawn`. | d.ts line 8276 |
| ✅ | `ProcessSpawnResult.code` | The child's exit status, null when a signal ended it. | Type: `number \| null`. | d.ts line 8276 |
| ✅ | `ProcessSpawnResult.signal` | What ended the child from outside (`SIGTERM`), null when it exited on its own. On Windows a killed child reads as an exit code, this null. | Type: `string \| null`. | d.ts line 8276 |
| ✅ | `ReadFunction` | `read($, source)`: the value of an atom (its initial while absent), of a derived value, or under a plain reference, one `$.state.get` per value. | Alias of the call forms of `read`. Made while a `ui.render` hook draws, it subscribes the drawing. Example: `const n = await read($, count)`. | d.ts line 9695 |
| ✅ | `Settings` | What `$.settings.read` answers: an object keyed as a settings.json is (`permissions`, `env`, `hooks`, `model`, `enabledPlugins`, ...). | Alias of `Readonly<Record<string, unknown>>`. Each key is as the settings docs describe it. A snapshot in plain data: a write to it changes nothing. Used by `$.settings.read`, `settings.read`. | d.ts line 12281 |
| ✅ | `SettingsReadArgs` | What `$.settings.read(args)` takes. | Object with fields `source?`. Used by `$.settings.read`, `settings.read`. | d.ts line 12286 |
| ✅ | `SettingsReadArgs.source` | The one source read, as loaded, absent, the settings merged over every source, as the engine runs under them. | Type: `SettingsSource`. Optional. | d.ts line 12286 |
| ✅ | `SettingsSource` | One source of settings by the name a plugin gives it, lowest precedence first, the engine's own name is the same word with `Settings` appended. | Alias of `'user' \| 'project' \| 'local' \| 'flag' \| 'policy'`. They match `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, `--settings`, and managed settings. | d.ts line 12303 |
| ✅ | `SleepOptions` | Options of `$.clock.sleep`. | Object with fields `signal?`. Used by `$.clock.sleep`. | d.ts line 12484 |
| ✅ | `SleepOptions.signal` | Aborting it rejects the sleep at once. | Type: `AbortSignal`. Optional. | d.ts line 12484 |
| ✅ | `StateAddress` | Which named value a `$.state` call is about, as it crosses to the host: the owning plugin, the key, and a family member's `id`. | Object with fields `plugin`, `key`, `id?`. The untyped form of a StateRef, identity, pinned on every `next`. | d.ts line 12569 |
| ✅ | `StateAddress.plugin` | A field of `StateAddress`. | Type: `string`. | d.ts line 12569 |
| ✅ | `StateAddress.key` | A field of `StateAddress`. | Type: `string`. | d.ts line 12569 |
| ✅ | `StateAddress.id` | A field of `StateAddress`. | Type: `string`. Optional. | d.ts line 12569 |
| ✅ | `StateDollar` | What the state library's `read` and `update` take of `$`: its `state` noun, on which they make the calls a hook would make itself. | Alias of `Pick<CoreEngineInterface, 'state'>`. | d.ts line 12579 |
| ✅ | `StateFamily` | A key of PluginState that holds one value of type `T` per `id` (one per drawn row, per worker): its reference must carry `id: string`. | Object with the field `byId`. Only a marker in the registry. `$.state.get` on a member answers `T`. Example: `interface PluginState { notes: { isOpen: StateFamily<boolean> } }`. | d.ts line 12592 |
| ✅ | `StateFamily.byId` | A field of `StateFamily`. | Type: `T`. | d.ts line 12592 |
| ✅ | `StateGetEvent` | `e` of `state.get`: one variant per value a contract declares, so a matcher on `plugin` and `key` narrows it, the untyped address while none does. | Alias of `[DeclaredPair] extends [never] ? StateAddress : DeclaredEvents<DeclaredPair>['get']`. Example: `on("state.get", { plugin: "swarm" }, ($, e, next) => next(e))`. Used by `state.get`. | d.ts line 12603 |
| ✅ | `StateName` | Which named value: the plugin that owns it and its key there, both literals where a contract declares the value. | Generic alias of `{ readonly plugin: P, readonly key: K, }`. | d.ts line 12609 |
| ✅ | `StateName.plugin` | A field of `StateName`. | Type: `P`. | d.ts line 12609 |
| ✅ | `StateName.key` | A field of `StateName`. | Type: `K`. | d.ts line 12609 |
| ✅ | `StateRead` | What `$.state.get` answers: the value and the version it stands at, a value never written is `undefined` at version 0. | Generic alias of `{ value: T \| undefined, version: number, }`. The version goes up by one on every write that lands, hand it back as `ifVersion` to write only if nobody wrote in between. Used by `$.state.get`, `state.get`. | d.ts line 12621 |
| ✅ | `StateRead.value` | A field of `StateRead`. | Type: `T \| undefined`. | d.ts line 12621 |
| ✅ | `StateRead.version` | A field of `StateRead`. | Type: `number`. | d.ts line 12621 |
| ✅ | `StateRef` | A typed reference to one named value: the owning plugin and the key, both literals, and for a StateFamily key the member's `id`. | Alias of the reference to a state value: `plugin` and `key`, plus `id` for a family. Write it once as a constant, with `plugin` and `key` as literals in the source. | d.ts line 12637 |
| ✅ | `StateSetEvent` | `e` of `state.set`: one variant per value a contract declares, so a matcher on `plugin` and `key` narrows `e.value`, the untyped write while none does. | Alias of the `state.set` event type. `plugin`, `key`, and `id` are pinned. A hook may rewrite `value`. Example: `next({ ...e, value: false })`. Used by `state.set`. | d.ts line 12649 |
| ✅ | `StateSetOptions` | The options of `$.state.set`: `ifVersion` makes the write conditional on the value still standing at that version (compare-and-set). | Object with fields `ifVersion?`. Used by `$.state.set`. | d.ts line 12655 |
| ✅ | `StateSetOptions.ifVersion` | A field of `StateSetOptions`. | Type: `number`. Optional. | d.ts line 12655 |
| ✅ | `StateSetResult` | What `$.state.set` answers: whether the write landed, and the version the value stands at now (a landed write's own, a missed one's the current). | Object with fields `isSet` and `version`. `isSet` is false only for a write given `ifVersion` that another write beat. Nothing changes then, and `$.state.get` reads what stands. | d.ts line 12666 |
| ✅ | `StateSetResult.isSet` | A field of `StateSetResult`. | Type: `true`. | d.ts line 12666 |
| ✅ | `StateSetResult.version` | A field of `StateSetResult`. | Type: `number`. | d.ts line 12666 |
| ✅ | `StateSetResult.isSet` | A field of `StateSetResult`. | Type: `false`. | d.ts line 12666 |
| ✅ | `StateSetResult.version` | A field of `StateSetResult`. | Type: `number`. | d.ts line 12666 |
| ✅ | `StateValue` | The type of the value under key `K` of plugin `P`, as its contract declares it in PluginState, a StateFamily's member type for a family key. | Alias of `PluginState[P][K] extends StateFamily<infer Member> ? Member : PluginState[P][K]`. Used by `$.state.get`, `$.state.set`. | d.ts line 12678 |
| ✅ | `StateWrite` | A `$.state.set` as it crosses to the host and as its hooks see it when no contract declares the value: the address, the value, and the condition. | Intersection with `StateAddress`. Object with the fields `value`, `previous?`, `ifVersion?`. `previous` is what stood there when the write was raised. | d.ts line 12687 |
| ✅ | `StateWrite.value` | A field of `StateWrite`. | Type: `unknown`. | d.ts line 12687 |
| ✅ | `StateWrite.previous` | A field of `StateWrite`. | Type: `unknown`. Optional. | d.ts line 12687 |
| ✅ | `StateWrite.ifVersion` | A field of `StateWrite`. | Type: `number`. Optional. | d.ts line 12687 |
| ✅ | `Timer` | A pending timer from `$.clock.after` / `$.clock.every`. | Object with fields `cancel`. | d.ts line 13253 |
| ✅ | `Timer.cancel` | Stops it, a stopped timer never fires again. | Type: `() => void`. | d.ts line 13253 |
| ✅ | `TimerCall` | A timer on `$.clock` (`after`, `every`): `fn` runs after `ms` milliseconds, once or until `cancel()`. | Alias of `(ms: number, fn: () => void) => Timer`. Used by `$.clock.after`, `$.clock.every`. | d.ts line 13264 |
| ✅ | `UpdateFunction` | `update($, target, fn)`: reads the value, applies `fn` here in the plugin's environment, writes with `ifVersion`, and tries again on a miss. | Alias of the call forms of `update`. A handler uses it instead of `$.state.set(ref, stale + 1)`. Two presses before a redraw both land. | d.ts line 15297 |
| ✅ | `atom` | A named value with its initial: `read` answers the initial while nothing is written, so never `undefined`. Pure, runs in the plugin's environment. | Alias of `export const atom: AtomFunction`. | d.ts line 15413 |
| ✅ | `derive` | A value computed from atoms and references, cached by their versions. | Alias of `export const derive: DeriveFunction`. Example: `const busy = derive([workers], list => list.filter(w => w.isBusy).length)`. | d.ts line 15421 |
| ✅ | `memberOf` | A family's member for the instance being drawn, keyed by `e.requestId`. | Alias of `export const memberOf: MemberOfFunction`. Example: `const open = await read($, memberOf(isOpen, e))`. | d.ts line 15429 |
| ✅ | `read` | Reads an atom, a derived value or a reference through `$.state.get`, while a `ui.render` hook draws, that subscribes the drawing. | Alias of `export const read: ReadFunction`. Example: `const n = await read($, count)`. | d.ts line 15438 |
| ✅ | `update` | Reads, applies `fn` in the plugin's environment, writes with `ifVersion`, and tries again on a miss: what a handler closure calls. | The `update` function, typed as `UpdateFunction`. Reads the current value, writes `change(value)`, and resolves what it wrote. Example: `update($, count, n => n + 1)`. | d.ts line 15447 |

## See Also

- [Mod API: Files, Store, and State](Claude-Code-Mod-API-Fs-Store-State)
- [Mod API: Clock, HTTP, Process, Env, and Settings](Claude-Code-Mod-API-Clock-Http-Process-Env-Settings)
- [Claude Code Mod API](Claude-Code-Mod-API)
- [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference)
