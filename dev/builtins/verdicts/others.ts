// The verdicts of the other groups, written by hand.
// One row for each part: `group:name`, the verdict, the bytes or `-`, and the reason, with a tab between them.

export const OTHERS = `
agents:Explore	keep	-	A read-only search agent. No lever makes it better.
agents:Plan	keep	-	A read-only planning agent. No lever makes it better.
agents:claude	keep	-	The default agent of FleetView, with a short prompt.
agents:comment-thread-analyst	keep	-	The engine loads it only for the artifact comment pipeline. It is not in the agent list.
agents:general-purpose	off	1726	Already denied by \`Agent(general-purpose)\` in \`prompt\`.
agents:main-session	keep	-	A label for a backgrounded main session, not an offered agent.
agents:statusline-setup	off	71	Already denied by \`Agent(statusline-setup)\`, and \`statusline\` slice owns the line.
attribution:commit and PR	keep	-	The trailer of a commit is a choice of the user, with the \`attribution\` setting.
compaction:summary prompt	replace	38033	\`session.compact\` answer of \`handoff\` makes a handoff in place of the summary.
git:instructions	off	4052	\`includeGitInstructions: false\` in \`plugins/claudetto/snippets.ts\`.
plugins:agents-md	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:claude-test	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:diff	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:easel	off	-	Canvas and artifact feature, which \`enableArtifact: false\` already turns off.
plugins:mermaid	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:mods-guide	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:plugin-authoring	off	-	Already \`false\` in \`enabledPlugins\`. A built-in mod still adds its skill line, so \`skillOverrides\` sets it to \`name-only\`.
plugins:responsive-mode	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:sec-default	keep	-	A security policy plugin for managed settings. No lever makes it better.
plugins:telemetry	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:tips	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:you-should-know	off	-	It makes its own model calls, so the snippet turns it off (design D2 of \`release-0-3-0-alpha-2\`).
sections:act_dont_rederive	off	-	\`claudetto:main\` holds a reword of it in the tag \`<act_dont_rederive>\` (task 19.3)
sections:action_caution	off	-	the body of \`claudetto:main\` replaces the system sections (A9)
sections:actions	off	3605	the body of \`claudetto:main\` replaces the system sections (A9)
sections:autonomy_append	off	-	\`claudetto:main\` holds a reword of it in the tag \`<autonomy_append>\` (task 19.3)
sections:bg-session	keep	-	fires only in background sessions, and it holds worktree rules
sections:brief	keep	-	fires only in brief mode, and it holds the mode rules
sections:brook_heron	keep	-	flag-gated effort text, tiny, and no lever makes it better
sections:communication	off	-	the body of \`claudetto:main\` replaces the system sections (A9)
sections:context_management	replace	-	a \`prompt.context\` block of \`prompt\` holds the text of the compaction state
sections:delivering_work_max	off	-	\`claudetto:main\` holds a reword of it in the tag \`<delivering_work_max>\` (task 19.3)
sections:doing_tasks	off	3776	the body of \`claudetto:main\` replaces the system sections (A9)
sections:endconv_deferred_hint	keep	-	fires only with the end-conversation tool, and it is 80 bytes
sections:env_info_simple	off	-	the body of \`claudetto:main\` replaces the system sections (A9)
sections:env_info_static	keep	-	used only when dynamic sections are off, and the transform covers \`env_info_simple\`
sections:fable_identity	keep	-	model identity line of 30 bytes, needed
sections:focus_mode	keep	-	fires only in focus mode, and it states what the user sees
sections:heron_brook	keep	-	effort guidance text that the model needs, not measured against ours
sections:intro	off	300	the body of \`claudetto:main\` replaces the system sections (A9), and its \`<security>\` block keeps the policy
sections:lean_body	off	-	the body of \`claudetto:main\` replaces the system sections (A9)
sections:memory	off	-	the body of \`claudetto:main\` replaces the system sections (A9)
sections:memory_static	keep	-	14 bytes, and \`autoMemoryEnabled\` is off already
sections:overcorrection	off	-	\`claudetto:main\` holds a reword of it in the tag \`<overcorrection>\` (task 19.3)
sections:pronouns	off	-	the body of \`claudetto:main\` replaces the system sections (A9)
sections:repl_working	keep	-	the function returns \`null\`, so it adds no text
sections:session_guidance	off	-	the body of \`claudetto:main\` replaces the system sections (A9)
sections:subagent_steer_delegation	off	-	\`claudetto:main\` holds a reword of it in the tag \`<subagent_steer_delegation>\` (task 19.3)
sections:surface	keep	-	fires only for a surface mode, and it is 29 bytes
sections:system	off	1041	the body of \`claudetto:main\` replaces the system sections (A9)
sections:system_messages	keep	-	fires only for a surface mode, and it explains system tags
sections:task_continuity	keep	-	approval-covers-task rule, and it is covered by no other text
sections:tone	off	544	the body of \`claudetto:main\` replaces the system sections (A9)
sections:tool_param_json	keep	-	guards against malformed JSON tool parameters
sections:tools	off	1015	the body of \`claudetto:main\` replaces the system sections (A9)
sections:total_tokens	keep	-	31 bytes, token counter text that the model needs
sections:user_pays	keep	-	flag is off by default, so it adds no text
sections:willow_tern	keep	-	flag-gated writing rule of 36 bytes, no lever makes it better
servertools:advisor	off	-	The \`advise\` tool went in 0.3.0 (D6 of \`0-3-0\`), and \`CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1\` of the snippet turns the built-in advisor off.
skills:artifact-capabilities	off	2281	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:artifact-components	off	470	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:artifact-design	off	209	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:artifact-diagramming	off	250	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:artifact-pr-review	off	636	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:batch	off	5769	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:claude-api	off	329	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:claude-in-chrome	off	838	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:code-review	off	1535	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:commit	off	3985	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:cowork-plugin	off	438	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:dataviz	off	1589	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:debug	off	112981	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:design	off	854	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:design-sync	off	419	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:doctor	off	50322	Off by \`disableBundledSkills\`, but stays typable. \`skillOverrides\` can hide it.
skills:explain-usage	off	1629	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:fewer-permission-prompts	off	8032	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:keybindings-help	off	1625	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:loop	off	436	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:memory-types	off	237	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:pr	off	2813	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:prototype	off	1370	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:run	off	78	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:run-skill-generator	off	111	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:schedule	off	5221	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:setup-claude	off	128	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:simplify	off	1793	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:update-config	off	13515	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:verify	off	514	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:whiteboard	off	942	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:workflow-authoring	off	278	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
skills:workshop	off	613	Already off by \`disableBundledSkills: true\` in \`plugins/claudetto/snippets.ts\`.
statusline:statusLine	replace	-	The \`statusline\` slice sets the \`statusLine\` command.
`;
