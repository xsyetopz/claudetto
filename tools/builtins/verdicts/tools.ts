// The verdicts of the tools, written by hand.
// One row for each part: `group:name`, the verdict, the bytes or `-`, and the reason, with a tab between them.

export default `
tools:Agent	replace	17696	\`tool.describe\` swaps the description for the shorter \`TOOL_AGENT\`.
tools:AppifactRepl	keep	-	not offered in a coding session: design or artifact mode only
tools:Artifact	keep	-	not offered in a coding session: \`enableArtifact\` is false
tools:ArtifactCheck	keep	-	not offered in a coding session: \`enableArtifact\` is false
tools:ArtifactComments	keep	-	not offered in a coding session: \`enableArtifact\` is false
tools:ArtifactData	keep	-	not offered in a coding session: \`enableArtifact\` is false
tools:AskUserQuestion	keep	-	Core tool, \`decide\` rewrites it only when the option is \`jev\`.
tools:Bash	keep	-	Core coding tool, no lever makes it better.
tools:ClaudeDesign	keep	-	not offered in a coding session: design mode only
tools:CronCreate	off	446	Off by \`CLAUDE_CODE_DISABLE_CRON\`.
tools:CronDelete	off	280	Off by \`CLAUDE_CODE_DISABLE_CRON\`.
tools:CronList	off	179	Off by \`CLAUDE_CODE_DISABLE_CRON\`.
tools:DesignSync	keep	-	not offered in a coding session: design mode only
tools:Edit	keep	-	Core coding tool, no lever makes it better.
tools:EndConversation	keep	-	not offered in a coding session: feature-gated, not verified in the bundle
tools:EnterPlanMode	off	89	Already in \`permissions.deny\` of \`prompt/slice.ts\`.
tools:EnterWorktree	keep	-	Core coding tool, no lever makes it better.
tools:ExitPlanMode	off	51	Already in \`permissions.deny\` of \`prompt/slice.ts\`.
tools:ExitWorktree	keep	-	Core coding tool, no lever makes it better.
tools:FetchInboxMessage	keep	-	not offered in a coding session: inbox or remote-session feature gate
tools:GetTask	keep	-	not offered in a coding session: feature-gated, not verified in the bundle
tools:Glob	keep	-	Core coding tool, no lever makes it better.
tools:Grep	keep	-	Core coding tool, no lever makes it better.
tools:LSP	keep	-	Core coding tool, no lever makes it better.
tools:ListAgents	replace	-	\`tool.describe\` sets \`isDeferred\`, so the tool is not in the base prompt.
tools:ListConnectors	keep	-	not offered in a coding session: connector gate of claude.ai
tools:ListMcpResourcesTool	keep	-	Offered only when an MCP server gives resources, small.
tools:Monitor	keep	-	Core coding tool, no lever makes it better.
tools:NotebookEdit	keep	-	Core coding tool, no lever makes it better.
tools:ObserverReport	keep	-	not offered in a coding session: observer mode only
tools:OfferChromeSetup	keep	-	not offered in a coding session: chrome setup flow only
tools:Poll	keep	-	not offered in a coding session: feature-gated, not verified in the bundle
tools:PowerShell	keep	-	Not offered on macOS or Linux: Windows gate.
tools:Projects	keep	-	not offered in a coding session: claude.ai projects gate
tools:ProposeGoal	off	1537	The goal engine of part 2 takes its place.
tools:PublishPlugin	keep	-	not offered in a coding session: plugin publish gate
tools:PushNotification	keep	-	not offered in a coding session: needs a mobile or remote gate
tools:Read	keep	-	Core coding tool, no lever makes it better.
tools:ReadMcpResourceDirTool	keep	-	Offered only when an MCP server gives resources, small.
tools:ReadMcpResourceTool	keep	-	Offered only when an MCP server gives resources, small.
tools:ReadNotifications	keep	-	not offered in a coding session: notification feature gate
tools:RefreshMcpTools	keep	-	not offered in a coding session: MCP refresh gate
tools:RemoteTrigger	keep	-	not offered in a coding session: remote trigger gate, tied to the \`schedule\` skill
tools:ReportFindings	off	1148	Already in \`permissions.deny\` of \`prompt/slice.ts\`.
tools:ScheduleWakeup	off	225	Already in \`permissions.deny\` of \`prompt/slice.ts\`.
tools:SearchMcpRegistry	keep	-	not offered in a coding session: MCP registry gate
tools:SendFeedback	keep	-	not offered in a coding session: feedback gate (\`feedbackDrafts\` is off)
tools:SendFile	keep	-	not offered in a coding session: remote-session gate
tools:SendMessage	keep	-	Core coding tool, no lever makes it better.
tools:SendUserFile	keep	-	not offered in a coding session: remote-session gate
tools:SendUserMessage	keep	-	not offered in a coding session: brief or assistant mode only
tools:ShareOnboardingGuide	keep	-	not offered in a coding session: onboarding mode only
tools:ShowOnboardingRolePicker	keep	-	not offered in a coding session: onboarding mode only
tools:Skill	keep	-	Core coding tool, no lever makes it better.
tools:StructuredOutput	keep	-	Needed for \`--json-schema\` runs, tiny.
tools:SubagentHandback	keep	-	Needed to end a subagent, text is 0 bytes.
tools:SuggestConnectors	keep	-	not offered in a coding session: connector gate of claude.ai
tools:SuggestPluginInstall	keep	-	not offered in a coding session: plugin suggestion gate
tools:SuggestSkills	keep	-	not offered in a coding session: skill suggestion gate
tools:TaskCreate	off	2418	Already in \`permissions.deny\` of \`prompt/slice.ts\`.
tools:TaskGet	off	753	Already in \`permissions.deny\` of \`prompt/slice.ts\`.
tools:TaskList	off	1646	Already in \`permissions.deny\` of \`prompt/slice.ts\`.
tools:TaskStop	off	1191	Already in \`permissions.deny\` of \`prompt/slice.ts\`.
tools:TaskUpdate	off	2272	Already in \`permissions.deny\` of \`prompt/slice.ts\`.
tools:TestingPermission	keep	-	not offered in a coding session: test builds only
tools:TodoWrite	keep	-	Core coding tool, no lever makes it better.
tools:ToolSearch	keep	-	Core coding tool, no lever makes it better.
tools:WaitForMcpServers	keep	-	not offered in a coding session: MCP wait gate
tools:WebFetch	keep	-	Core coding tool, no lever makes it better.
tools:WebSearch	replace	8045	\`browser/search\` answers it in place of the built-in.
tools:Workflow	keep	-	not offered in a coding session: \`enableWorkflows\` is false
tools:Write	keep	-	Core coding tool, no lever makes it better.
tools:memory_list	keep	-	not offered in a coding session: memory-store feature gate
tools:memory_read	keep	-	not offered in a coding session: memory-store feature gate
tools:memory_write	keep	-	not offered in a coding session: memory-store feature gate
tools:propose_skills	keep	-	not offered in a coding session: skill suggestion gate
tools:self_hosted_runner_get_pool	keep	-	not offered in a coding session: self-hosted runner mode only
tools:self_hosted_runner_list_runners	keep	-	not offered in a coding session: self-hosted runner mode only
tools:self_hosted_runner_list_secrets	keep	-	not offered in a coding session: self-hosted runner mode only
tools:self_hosted_runner_list_sessions	keep	-	not offered in a coding session: self-hosted runner mode only
tools:self_hosted_runner_read_health	keep	-	not offered in a coding session: self-hosted runner mode only
tools:self_hosted_runner_read_metrics	keep	-	not offered in a coding session: self-hosted runner mode only
tools:self_hosted_runner_requeue_session	keep	-	not offered in a coding session: self-hosted runner mode only
tools:self_hosted_runner_spawn_local	keep	-	not offered in a coding session: self-hosted runner mode only
tools:self_hosted_runner_tail_log	keep	-	not offered in a coding session: self-hosted runner mode only
`;
