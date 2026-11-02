# Run a command again with backoff until it succeeds
retry *command:
    bun scripts/retry.ts {{command}}
