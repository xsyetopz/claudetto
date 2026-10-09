// The built-in `context_management` section says that the context is summarized when it grows long.
// With `DISABLE_COMPACT` that is false, and the model then spends less care on the size of the context.
// The text is the same for each call, so the cached answer keeps the prompt cache.
export const CONTEXT_MANAGEMENT = `# Context management
Compaction is off in this session, so no message is summarized or removed.
When the context reaches its limit, the session stops, and the user starts a fresh session with \`/clear\`.
Each turn reads the whole context again, so keep long output, such as logs and file dumps, out of it, and delegate long reads to a subagent.
Keep the state of work that needs more than one session in the repository, in OpenSpec task checkboxes and commits, because a fresh session starts with only the repository.
Continue the task until it is done, because the user decides when to clear.`;
