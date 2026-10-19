# Claude Code Tools: Files, Search, and Memory

These tools read, write, and search files, and they store memory notes.
Use `Read` before `Edit`, because `Edit` replaces an exact string in a file.
For example, `Grep` with `output_mode` set to `files_with_matches` lists only the files that match.
The marks are explained on [Tools](Claude-Code-Tools).

## Tools

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Read-Only | Parallel | Deferred | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ✅ | `Read` | Reads files, images, PDFs, and notebooks. | Parameters are listed in [Read Parameters](#read-parameters). | Main session and subagents. Kept in background subagents. | ✅ | ✅ | ❌ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ | `Write` | Creates or overwrites a file. | `file_path` (string, required, absolute), `content` (string, required), `machine` (optional). A deny rule wins. | Main session and subagents. Kept in background subagents. | ❌ | ❌ | ❌ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ | `Edit` | Replaces an exact string in a file. | `file_path` (string, required), `old_string` (string, required), `new_string` (string, required, must differ), `replace_all` (boolean, default false), `machine` (optional). | Main session and subagents. Kept in background subagents. | ❌ | ❌ | ❌ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ | `NotebookEdit` | Edits a cell of a Jupyter notebook. | Parameters are listed in [NotebookEdit Parameters](#notebookedit-parameters). | Main session and subagents. Kept in background subagents. | ❌ | ❌ | ✅ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ | `Glob` | Finds files by glob pattern. | `pattern` (string, required), `path` (string, optional, directory), `machine` (optional). | Main session and subagents. The docs say a subagent can get `Glob` and `Grep` when the main session lacks them (macOS, Linux, WSL). | ✅ | ✅ | ❌ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ | `Grep` | Searches file contents with ripgrep. | Parameters are listed in [Grep Parameters](#grep-parameters). | Same as `Glob`. | ✅ | ✅ | ❌ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| ✅ | `LSP` | Code intelligence: definitions, references, symbols, hover, call hierarchy. | `operation`, `filePath` (required), `line` (int >= 1, required), `character` (int >= 1, required), `query` (optional, `workspaceSymbol` only). | Main session and subagents. Background subagents keep it since `2.1.280`. | ✅ | ✅ | ✅ | [Tools Reference](https://code.claude.com/docs/en/tools-reference), [Create Custom Subagents](https://code.claude.com/docs/en/sub-agents) |
| 🔍 🧪 | `memory_read` | Reads a document from a memory store. | `store` (string, required), `path` (string, required). A hidden server-side flag turns it on. | Unknown | ✅ | ✅ | ❌ | Bundle `searchHint:"read a document from a memory store"` |
| 🔍 🧪 | `memory_write` | Saves a document to a memory store. | `store` (string, required), `path` (string, required), `content` (string, required, replaces the whole document), `if_version` (string, max 64, version token for compare-and-set). | Unknown | ❌ | ❌ | ❌ | Bundle `searchHint:"save a document to a memory store"` |
| 🔍 🧪 | `memory_list` | Lists memory stores and their documents. | `store` (optional), `path_prefix` (optional, directory-aligned), `cursor` (optional). A hidden server-side flag turns it on. | Unknown | ✅ | ✅ | ❌ | Bundle `searchHint:"list the memory stores and the documents in them"` |

## Read Parameters

| Parameter | What It Does | Required |
| --- | --- | --- |
| `file_path` | Absolute path of the file. | ✅ |
| `offset` | Line to start from, 0 or more. | ❌ |
| `limit` | Number of lines to read, more than 0. | ❌ |
| `pages` | PDF page range such as `1-5`, at most 20 pages at a time. | ❌ |
| `allow_large` | Reads a file or range over the usual size limits, as far as the context allows. | ❌ |
| `machine` | Name of an attached machine. Offered only when machines are attached. | ❌ |

## NotebookEdit Parameters

| Parameter | What It Does | Required |
| --- | --- | --- |
| `notebook_path` | Absolute path of the `.ipynb` file. | ✅ |
| `new_source` | The new source of the cell. | ✅ |
| `cell_id` | Cell to edit. For `insert`, the new cell goes after it. | ❌ |
| `cell_type` | `code` or `markdown`. Required for `insert`. | ❌ |
| `edit_mode` | `replace` (default), `insert`, or `delete`. | ❌ |

## Grep Parameters

| Parameter | What It Does | Required |
| --- | --- | --- |
| `pattern` | The regular expression to search for. | ✅ |
| `path` | File or directory to search. | ❌ |
| `glob` | Glob filter such as `**/*.tsx`. | ❌ |
| `output_mode` | `content`, `files_with_matches` (default), or `count`. | ❌ |
| `-B` | Lines before each match. Needs `content` mode. | ❌ |
| `-A` | Lines after each match. Needs `content` mode. | ❌ |
| `-C` | Alias for `context`. | ❌ |
| `context` | Lines before and after each match. Needs `content` mode. | ❌ |
| `-n` | Shows line numbers. Needs `content` mode, default true. | ❌ |
| `-i` | Case-insensitive search. | ❌ |
| `-o` | Prints only the matched parts. Needs `content` mode. | ❌ |
| `type` | File type such as `js`, `py`, or `rust`. | ❌ |
| `head_limit` | Limits the first N entries. Default 250, `0` for no limit. | ❌ |
| `offset` | Skips the first N entries before `head_limit`. | ❌ |
| `multiline` | Lets `.` match newlines and patterns span lines. | ❌ |
| `machine` | Name of an attached machine. Offered only when machines are attached. | ❌ |

The source is the tool input schemas in the bundle.

## Notes

- `machine` is an extra optional field that Claude Code adds to a tool schema when an attached-machines feature is on.
- File tools that call `checkPermissions` use the rule syntax in [Permissions and Sandbox](Claude-Code-Permissions-And-Sandbox).
- `Read`, `Glob`, `Grep`, `Write`, and `Edit` also have `remoteExecution` metadata (`supported:!0`) in the bundle.
  It marks them as runnable on a remote host.

## See Also

- [Tools Reference](https://code.claude.com/docs/en/tools-reference) is the docs page.
- [Permissions And Sandbox](Claude-Code-Permissions-And-Sandbox) covers path rules for file tools.
