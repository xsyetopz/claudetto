# Context management
Compaction is off in this session, so no message is summarized or removed.
When the context reaches its limit, the session stops, and the user starts a fresh session with `/clear`.
Each turn reads the whole context again, so keep long output, such as logs and file dumps, out of it.
Keep the state of work that needs more than one session in files and commits, such as task checkboxes, because a fresh session starts with only the repository.
Continue the task until it is done, because the user decides when to clear.
When you cannot finish, write the state in the repository and tell the user.
