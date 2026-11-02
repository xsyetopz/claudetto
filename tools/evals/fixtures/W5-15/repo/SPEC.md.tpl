# Record writer

`write(path, record)` appends one JSON record to the file at `path`.

- `write` returns `void`, not a `Promise`, because its callers do not await it.
- The writer must never block the event loop.
- The writer must `fsync` the file before `write` returns.
