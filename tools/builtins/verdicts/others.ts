// The verdicts of the other groups, written by hand.
// One row for each part: `group:name`, the verdict, the bytes or `-`, and the reason, with a tab between them.

export default `
agents:Explore	keep	-	A read-only search agent. No lever makes it better.
agents:Plan	keep	-	A read-only planning agent. No lever makes it better.
agents:claude	keep	-	The default agent of FleetView, with a short prompt.
agents:comment-thread-analyst	off	0	Only for the artifact comment pipeline, and artifacts are off.
agents:general-purpose	off	1726	Already denied by \`Agent(general-purpose)\` in \`prompt\`.
agents:main-session	keep	-	A label for a backgrounded main session, not an offered agent.
agents:statusline-setup	off	71	Already denied by \`Agent(statusline-setup)\`, and \`statusline\` slice owns the line.
attribution:commit and PR	keep	-	The trailer of a commit is a choice of the user, with the \`attribution\` setting.
compaction:summary prompt	replace	38033	\`session.compact\` answer of \`handoff\` makes a handoff in place of the summary.
git:instructions	off	4052	\`includeGitInstructions: false\` in \`slices/setup/slice.ts\`.
plugins:agents-md	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:claude-test	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:diff	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:easel	off	-	Canvas and artifact feature, which \`enableArtifact: false\` already turns off.
plugins:mermaid	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:mods-guide	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:plugin-authoring	keep	-	Already \`name-only\` in \`skillOverrides\`, and the repository makes plugins.
plugins:responsive-mode	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:sec-default	keep	-	A security policy plugin for managed settings. No lever makes it better.
plugins:telemetry	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:tips	off	-	Already \`false\` in \`enabledPlugins\` (\`prompt\` slice).
plugins:you-should-know	off	-	An opt-in promo for a side agent. No \`claudetto-you-should-know\` add-on exists in \`src/plugins\`.
sections:act_dont_rederive	keep	-	behaviour rule against re-deriving facts, no lever makes it better
sections:action_caution	replace	-	\`prompt.section\` rewrite in \`transforms/index.ts\` is shorter
sections:actions	off	3605	\`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1\` drops it and \`lean_body\` takes its place
sections:autonomy_append	keep	-	fires only in autonomous runs, and it guards against blocking questions
sections:bg-session	keep	-	fires only in background sessions, and it holds worktree rules
sections:brief	keep	-	fires only in brief mode, and it holds the mode rules
sections:brook_heron	keep	-	flag-gated effort text, tiny, and no lever makes it better
sections:communication	replace	-	\`prompt.section\` rewrite in \`transforms/communication.ts\` is shorter
sections:context_management	replace	-	\`prompt.section\` answers with text gated by the compaction state
sections:delivering_work_max	keep	-	flag-gated behaviour rule for scope, not measured against ours
sections:doing_tasks	off	3776	\`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1\` drops it and \`lean_body\` takes its place
sections:endconv_deferred_hint	keep	-	fires only with the end-conversation tool, and it is 80 bytes
sections:env_info_simple	replace	-	\`prompt.section\` rewrite in \`transforms/env_info_simple.ts\` is shorter
sections:env_info_static	keep	-	used only when dynamic sections are off, and the transform covers \`env_info_simple\`
sections:fable_identity	keep	-	model identity line of 30 bytes, needed
sections:focus_mode	keep	-	fires only in focus mode, and it states what the user sees
sections:heron_brook	keep	-	effort guidance text that the model needs, not measured against ours
sections:intro	off	300	\`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1\` drops it and \`lean_body\` takes its place
sections:lean_body	replace	-	\`prompt.section\` answers with the tailored text of claudetto
sections:memory	replace	-	\`prompt.section\` rewrite in \`transforms/memory.ts\` is shorter
sections:memory_static	keep	-	14 bytes, and \`autoMemoryEnabled\` is off already
sections:overcorrection	keep	-	flag-gated rule against self-correction noise, 27 bytes
sections:pronouns	replace	-	\`prompt.section\` rewrite in \`transforms/index.ts\` is shorter
sections:repl_working	keep	-	the function returns \`null\`, so it adds no text
sections:session_guidance	replace	-	\`prompt.section\` rewrite in \`transforms/session_guidance.ts\` is shorter
sections:subagent_steer_delegation	keep	-	fires only on a flag, and it steers delegation
sections:surface	keep	-	fires only for a surface mode, and it is 29 bytes
sections:system	off	1041	\`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1\` drops it and \`lean_body\` takes its place
sections:system_messages	keep	-	fires only for a surface mode, and it explains system tags
sections:task_continuity	keep	-	approval-covers-task rule, and it is covered by no other text
sections:tone	off	544	\`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1\` drops it and \`lean_body\` takes its place
sections:tool_param_json	keep	-	guards against malformed JSON tool parameters
sections:tools	off	1015	\`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1\` drops it and \`lean_body\` takes its place
sections:total_tokens	keep	-	31 bytes, token counter text that the model needs
sections:user_pays	keep	-	flag is off by default, so it adds no text
sections:willow_tern	keep	-	flag-gated writing rule of 36 bytes, no lever makes it better
servertools:advisor	replace	-	Part 3 of \`builtins-0-2-0\`: no hook can refuse a server tool, so the engine turns it off and registers a tool.
skills:artifact-capabilities	off	2281	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:artifact-components	off	470	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:artifact-design	off	209	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:artifact-diagramming	off	250	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:artifact-pr-review	off	636	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:batch	off	5769	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:claude-api	off	329	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:claude-in-chrome	off	838	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:code-review	off	1535	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:commit	off	3985	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:cowork-plugin	off	438	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:dataviz	off	1589	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:debug	off	112981	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:design	off	854	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:design-sync	off	419	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:doctor	off	50322	Off by \`disableBundledSkills\`, but stays typable. \`skillOverrides\` can hide it.
skills:explain-usage	off	1629	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:fewer-permission-prompts	off	8032	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:keybindings-help	off	1625	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:loop	off	436	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:memory-types	off	237	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:pr	off	2813	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:prototype	off	1370	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:run	off	78	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:run-skill-generator	off	111	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:schedule	off	5221	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:setup-claude	off	128	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:simplify	off	1793	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:update-config	off	13515	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:verify	off	514	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:whiteboard	off	942	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:workflow-authoring	off	278	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
skills:workshop	off	613	Already off by \`disableBundledSkills: true\` in \`prompt/slice.ts\`.
statusline:statusLine	replace	-	The \`statusline\` slice sets the \`statusLine\` command.
`;
