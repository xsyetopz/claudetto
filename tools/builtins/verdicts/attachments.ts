// The verdicts of the attachments, written by hand.
// One row for each part: `group:name`, the verdict, the bytes or `-`, and the reason, with a tab between them.

export default `
attachments:account_memory_recall	keep	-	memory content, never turned off
attachments:advisor_stripped	keep	-	marker with no model text, so nothing to remove
attachments:advisor_tool	replace	-	part 3 replaces the advisor, and no hook can rewrite a server tool
attachments:agent_listing_delta	keep	-	lists agent types the model can call
attachments:agent_mention	keep	-	user-supplied context or file content, never turned off
attachments:already_read_file	keep	-	user-supplied context or file content, never turned off
attachments:artifact_opening_prefetch	off	6	\`enableArtifact\` is false
attachments:async_hook_response	keep	-	hook output, never turned off
attachments:async_hook_response_batch	keep	-	hook output, never turned off
attachments:at_mention_reference	keep	-	user-supplied context or file content, never turned off
attachments:attention_budget	keep	-	flag-gated nudge with no text found, so no measured gain
attachments:auto_mode	keep	-	permission and safety text of auto mode
attachments:auto_mode_exit	keep	-	permission text that ends auto mode
attachments:bash_output_audience_note	keep	-	diagnostic, safety, or limit text, never turned off
attachments:batching_reminder	keep	-	flag-gated nudge with no text found, so no measured gain
attachments:batching_reminder_sent	keep	-	flag-gated nudge with no text found, so no measured gain
attachments:budget_usd	keep	-	counter of 28 bytes, budget awareness
attachments:command_permissions	keep	-	diagnostic, safety, or limit text, never turned off
attachments:compact_file_reference	keep	-	user-supplied context or file content, never turned off
attachments:context_efficiency	keep	-	flag-gated nudge with no text found, so no measured gain
attachments:context_sections	keep	-	session state or marker that the engine needs
attachments:coordinator_context	keep	-	team or fork state, and claudetto does not turn off that feature
attachments:cowork_memory_context	keep	-	memory content, never turned off
attachments:credential_org	keep	-	session state or marker that the engine needs
attachments:critical_system_reminder	keep	-	diagnostic, safety, or limit text, never turned off
attachments:date	keep	-	date, never turned off
attachments:date_change	keep	-	date, never turned off
attachments:deferred_tools_delta	keep	-	lists deferred tool names for \`ToolSearch\`, real size is about 2000 bytes per session start
attachments:deferred_tools_record	keep	-	session state or marker that the engine needs
attachments:diagnostics	keep	-	diagnostic, safety, or limit text, never turned off
attachments:dir_sync_notice	keep	-	session state or marker that the engine needs
attachments:directory	keep	-	user-supplied context or file content, never turned off
attachments:dynamic_skill	keep	-	user-supplied context or file content, never turned off
attachments:edited_image_file	keep	-	user-supplied context or file content, never turned off
attachments:edited_text_file	keep	-	user-supplied context or file content, never turned off
attachments:elapsed_time_reminder	keep	-	flag-gated nudge with no text found, so no measured gain
attachments:environment	keep	-	session state or marker that the engine needs
attachments:file	keep	-	user-supplied context or file content, never turned off
attachments:fork_briefing	keep	-	team or fork state, and claudetto does not turn off that feature
attachments:goal_status	off	284	the goal engine of part 2 gives its own status text
attachments:hook_additional_context	keep	-	hook output, never turned off
attachments:hook_blocking_error	keep	-	hook output, never turned off
attachments:hook_cancelled	keep	-	hook output, never turned off
attachments:hook_deferred_tool	keep	-	hook output, never turned off
attachments:hook_error_during_execution	keep	-	hook output, never turned off
attachments:hook_non_blocking_error	keep	-	hook output, never turned off
attachments:hook_permission_decision	keep	-	hook output, never turned off
attachments:hook_plugin_listing	keep	-	hook output, never turned off
attachments:hook_stopped_continuation	keep	-	hook output, never turned off
attachments:hook_success	keep	-	hook output, never turned off
attachments:hook_system_message	keep	-	hook output, never turned off
attachments:inlined_image_paths	keep	-	user-supplied context or file content, never turned off
attachments:instructions	keep	-	CLAUDE.md content, never turned off
attachments:invoked_skills	keep	-	user-supplied context or file content, never turned off
attachments:language	keep	-	session state or marker that the engine needs
attachments:max_turns_reached	keep	-	diagnostic, safety, or limit text, never turned off
attachments:mcp_dropped_tools_delta	keep	-	diagnostic of MCP tools that were dropped
attachments:mcp_instructions_delta	keep	-	instructions of MCP servers that the user enabled
attachments:mcp_resource	keep	-	user-supplied context or file content, never turned off
attachments:memory_update	keep	-	memory content, never turned off
attachments:model	keep	-	session state or marker that the engine needs
attachments:nested_memory	keep	-	CLAUDE.md content, never turned off
attachments:opened_file_in_ide	keep	-	user-supplied context or file content, never turned off
attachments:output_limit_note	keep	-	diagnostic, safety, or limit text, never turned off
attachments:output_style	keep	-	style that the user chose
attachments:output_style_instructions	keep	-	diagnostic, safety, or limit text, never turned off
attachments:output_token_usage	keep	-	counter of 45 bytes, no lever makes it better
attachments:pdf_reference	keep	-	user-supplied context or file content, never turned off
attachments:peer_mention	keep	-	user-supplied context or file content, never turned off
attachments:plan_file_reference	keep	-	carries the plan content that the model needs
attachments:plan_mode	keep	-	safety text of plan mode, which the user can still enter
attachments:plan_mode_exit	keep	-	tells the model that edits are allowed again
attachments:plan_mode_reentry	keep	-	plan mode text, and the user can still enter it
attachments:poll_events	keep	-	team or fork state, and claudetto does not turn off that feature
attachments:prefix_delta	keep	-	session state or marker that the engine needs
attachments:proactivity	keep	-	flag-gated nudge with no text found, so no measured gain
attachments:prompt_render_point	keep	-	session state or marker that the engine needs
attachments:prompt_snapshot	keep	-	session state or marker that the engine needs
attachments:queued_command	keep	-	user-supplied context or file content, never turned off
attachments:read_truncation_notice	keep	-	diagnostic, safety, or limit text, never turned off
attachments:relevant_memories	keep	-	memory content, never turned off
attachments:remote_session_change	keep	-	session state or marker that the engine needs
attachments:sandbox_instructions	keep	-	diagnostic, safety, or limit text, never turned off
attachments:secondary_reminder	keep	-	flag-gated nudge with no text found, so no measured gain
attachments:secondary_reminder_sent	keep	-	flag-gated nudge with no text found, so no measured gain
attachments:selected_lines_in_diff	keep	-	user-supplied context or file content, never turned off
attachments:selected_lines_in_ide	keep	-	user-supplied context or file content, never turned off
attachments:session_context	keep	-	session state or marker that the engine needs
attachments:session_cron_carry	off	0	\`CLAUDE_CODE_DISABLE_CRON=1\` removes cron tools
attachments:session_settings	keep	-	session state or marker that the engine needs
attachments:silent_turn_reminder	keep	-	flag-gated nudge with no text found, so no measured gain
attachments:skill_listing	keep	-	user-supplied context or file content, never turned off
attachments:skill_mention	keep	-	user-supplied context or file content, never turned off
attachments:structured_output	keep	-	diagnostic, safety, or limit text, never turned off
attachments:task_reminder	off	438	\`Task*\` tools are denied, so the nudge points at tools the model lacks
attachments:task_status	keep	-	status of background tasks that the model needs
attachments:team_context	keep	-	team or fork state, and claudetto does not turn off that feature
attachments:teammate_mailbox	keep	-	team or fork state, and claudetto does not turn off that feature
attachments:teammate_shutdown_batch	keep	-	team or fork state, and claudetto does not turn off that feature
attachments:thinking_drop	keep	-	session state or marker that the engine needs
attachments:thinking_stripped	keep	-	session state or marker that the engine needs
attachments:thread_state	keep	-	session state or marker that the engine needs
attachments:todo_reminder	keep	-	nudge, but it carries the todo list, and \`TodoWrite\` use is not checked
attachments:token_usage	keep	-	counter of 26 bytes, no lever makes it better
attachments:tool_host_result_lines	keep	-	session state or marker that the engine needs
attachments:tool_hosts_correction	keep	-	session state or marker that the engine needs
attachments:tool_hosts_notice	off	300	fires only for computer-use tool hosts, and \`mcp__computer-use\` is denied
attachments:tool_search_usage_reminder	keep	-	names tools whose schemas are not loaded, needed for discovery
attachments:total_tokens_reminder	keep	-	counter that follows the token budget setting
attachments:ultra_effort_enter	keep	-	effort mode that the user chose
attachments:ultra_effort_exit	keep	-	effort mode that the user chose
attachments:ultrathink_effort	keep	-	user keyword that sets the effort
attachments:unknown_command_fallback	keep	-	diagnostic, safety, or limit text, never turned off
attachments:withheld_memory	keep	-	memory notice, never turned off
attachments:workflow_keyword_request	off	143	\`enableWorkflows\` is false, so the keyword nudge is useless
attachments:workflow_size_guideline_change	keep	-	flag-gated nudge with no text found, so no measured gain
`;
