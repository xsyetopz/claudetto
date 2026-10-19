# Claude Code CLI Stream JSON Control

Control requests let a host program steer a running Claude Code process.
They travel on the same JSON line channel as the messages in [CLI Stream JSON](Claude-Code-CLI-Stream-Json).
The Agent SDK uses them, for example to change the model or to answer a permission question.
A host sends a line with `type` set to `control_request` and `request.subtype` set to `set_model`, and Claude Code answers with a `control_response` line.

## Subtypes

The schema does not mark the direction of each request.
The table lists the subtypes of the schema.
Only the Agent SDK pages describe most of them, and no other docs page does, so the rows have the mark 🔍.
Source: the bundle schema of `2.1.303`.

| `subtype` | Mark | What it does |
| --- | --- | --- |
| `initialize` | 🔍 | Starts the SDK session with hooks, MCP servers, and agent settings. |
| `interrupt` | 🔍 | Stops the turn that runs now. |
| `can_use_tool` | 🔍 | Asks for permission to use a tool with the given input. |
| `set_permission_mode` | 🔍 | Sets the permission mode. |
| `set_model` | 🔍 | Sets the model for the next turns. |
| `set_max_thinking_tokens` | 🔍 | The bundle gives no description. |
| `rename_session` | 🔍 | Sets the title of the session. |
| `set_color` | 🔍 | The bundle gives no description. |
| `mcp_status` | 🔍 | Asks for the state of all MCP server connections. |
| `file_suggestions` | 🔍 | Asks for `@` file suggestions for a partial path. |
| `get_context_usage` | 🔍 | Asks for the use of the context window by category. |
| `get_session_cost` | 🔍 | Asks for the cost summary that `/usage` prints in print mode. |
| `list_models` | 🔍 | Asks for the models that the worker lets you choose. |
| `get_usage` | 🔍 | Asks for the data of `/usage`, with plan limits when they are known. |
| `get_status` | 🔍 | Asks for the rows of the `/status` screen as text. |
| `export_conversation` | 🔍 | Asks for the conversation as the text that `/export` writes. |
| `get_memory_dialog` | 🔍 | Asks for the rows and switches of the `/memory` dialog. |
| `get_skills_dialog` | 🔍 | Asks for the rows of the `/skills` menu. |
| `get_chrome_dialog` | 🔍 | Asks for the state of the `/chrome` dialog. |
| `get_chrome_browsers` | 🔍 | Asks for the browsers that are connected to Claude in Chrome. |
| `select_chrome_browser` | 🔍 | Switches Claude in Chrome to the browser that you name. |
| `get_sandbox_dialog` | 🔍 | Asks for the state of the `/sandbox` dialog. |
| `get_binary_version` | 🔍 | Asks for the version of the binary. |
| `mcp_call` | 🔍 | Calls an MCP tool without a model turn. |
| `rewind_files` | 🔍 | Undoes the file changes made since a user message. |
| `cancel_async_message` | 🔍 | Removes a waiting async user message from the queue. |
| `read_file` | 🔍 | Reads a file of the session, for a remote sidebar viewer. |
| `list_directory` | 🔍 | The bundle gives no description. |
| `get_workspace_diff` | 🔍 | Asks for the git diff of the workspace. |
| `get_plan` | 🔍 | Reads the current plan of plan mode. |
| `seed_read_state` | 🔍 | Seeds the cache of read files with a path and a time. |
| `hook_callback` | 🔍 | Delivers a hook callback with its input. |
| `register_device_hooks` | 🔍 | Registers the hooks of a device with the worker. |
| `upload_device_hook_template` | 🔍 | Sends a hook template before the device hooks register. |
| `remote_tools_announce` | 🔍 | A cloud client says which tools it serves. |
| `remote_tool_call` | 🔍 | Forwards one step of a tool call to the attached machine. |
| `remote_plumbing_call` | 🔍 | Calls a plumbing tool on the attached machine. |
| `remote_tools_probe` | 🔍 | Checks that an announced machine is still alive. |
| `remote_tools_reannounce` | 🔍 | A new worker asks the client to announce its tools again. |
| `turn_handoff` | 🔍 | The bundle gives no description. |
| `mcp_message` | 🔍 | Carries one MCP message for an MCP server that the SDK hosts. |
| `mcp_set_servers` | 🔍 | Replaces the set of MCP servers that the host manages. |
| `reload_plugins` | 🔍 | Reloads plugins from disk. |
| `reload_skills` | 🔍 | Reloads skills from disk. |
| `reload_output_styles` | 🔍 | Reads the output style folders again. |
| `register_repo_root` | 🔍 | Adds a folder as a working folder root, and can reload `CLAUDE.md`, skills, and plugins. |
| `set_cwd` | 🔍 | Moves the session to a new working folder, like `/cd`. |
| `claim_session` | 🔍 | The bundle gives no description. |
| `mcp_reconnect` | 🔍 | Reconnects an MCP server that failed. |
| `mcp_toggle` | 🔍 | Turns an MCP server on or off. |
| `mcp_read_resource` | 🔍 | The bundle gives no description. |
| `set_mcp_permission_mode_override` | 🔍 | Sets or clears the permission mode of one MCP server. |
| `set_chrome_browser_hints` | 🔍 | Tells the session which Claude in Chrome browser to prefer. |
| `set_prompt_suggestions_paused` | 🔍 | Pauses or resumes prompt suggestions. |
| `stop_task` | 🔍 | Stops a running task. |
| `background_tasks` | 🔍 | The bundle gives no description. |
| `get_task_output` | 🔍 | Reads the last 8 KiB of the output of a background task. |
| `apply_flag_settings` | 🔍 | Merges settings into the flag settings layer. |
| `get_settings` | 🔍 | Returns the merged settings and the settings of each source. |
| `update_settings` | 🔍 | Writes settings through the writer of Claude Code. |
| `get_hooks_listing` | 🔍 | Returns the hooks that the read-only `/hooks` menu shows. |
| `list_permission_rules` | 🔍 | Returns the permission rules and workspace folders that `/permissions` lists. |
| `elicitation` | 🔍 | Asks the SDK consumer to handle an MCP elicitation. |
| `request_user_dialog` | 🔍 | Asks the SDK consumer to show a dialog and return the choice. |
| `submit_feedback` | 🔍 | Sends a `/feedback` report with the transcript and a cleaned error log. |
| `remote_control_work_secret` | 🔍 | Asks the host for a fresh work secret for Remote Control. |
| `oauth_token_refresh` | 🔍 | Asks the host for a fresh OAuth token after a `401` error. |
| `host_auth_token_refresh` | 🔍 | Asks the host for a fresh provider credential after a credential failure. |
| `message_rated` | 🔍 | Records a thumbs up or down for a message. |
| `ui_attach` | 🔍 | A remote screen joins the session. |
| `ui_detach` | 🔍 | A remote screen leaves the session. |
| `ui_render` | 🔍 | The bundle gives no description. |
| `ui_press` | 🔍 | A press on a button or link that a plugin drew for a remote screen. |
| `ui_client_module` | 🔍 | Asks for the screen modules of a plugin. |
| `ui_input` | 🔍 | A change in an input that a plugin drew for a remote screen. |
| `ui_select` | 🔍 | A pick in a select that a plugin drew for a remote screen. |
| `ui_panes` | 🔍 | Asks for the list of open panes. |
| `ui_pane_show` | 🔍 | The person chose which open pane the screen shows. |
| `ui_pane_focus` | 🔍 | The keyboard moved between the prompt box and a pane. |
| `ui_close` | 🔍 | The person closed a pane on a remote screen. |
| `ui_scroll` | 🔍 | The person scrolled a site that a remote screen draws. |
| `ui_focus` | 🔍 | The keyboard moved in a site that a remote screen draws. |
| `ui_copy` | 🔍 | The bundle gives no description. |
| `ui_prompt_read` | 🔍 | A plugin reads the draft and cursor of the prompt box. |
| `ui_prompt_fill` | 🔍 | A plugin puts text in the prompt box as a draft. |
| `ui_prompt_suggest` | 🔍 | A plugin or the engine shows a suggestion in the prompt box. |
| `ui_read_selection` | 🔍 | The bundle gives no description. |
| `ui_prompt_edit` | 🔍 | An edit in the prompt box of a remote screen. |
| `ui_prompt_autocomplete` | 🔍 | A remote prompt box asks what the plugins add to its autocomplete list. |
| `success` | 🔍 | The request was handled. |
| `error` | 🔍 | The request failed or was refused. |

## See Also

- [CLI Stream JSON](Claude-Code-CLI-Stream-Json)
- [CLI](Claude-Code-CLI)
