// The verdicts of the commands, written by hand.
// One row for each part: `group:name`, the verdict, the bytes or `-`, and the reason, with a tab between them.

export default `
commands:add-dir	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:advisor	replace	-	Part 3 of \`builtins-0-2-0\`: an advisor that the user controls.
commands:agents	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:artifacts	off	52	\`enableArtifact\` is \`false\`, so the command has no use.
commands:auto-mode-setup	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:autocompact	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:autofix-pr	off	60	A cloud PR monitor that claudetto does not use.
commands:background	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:branch	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:brief	off	22	claudetto sets its own output style in \`styles\`, so the brief toggle has no use.
commands:btw	keep	-	Already hidden and disabled in this build.
commands:bug	off	47	\`DISABLE_FEEDBACK_COMMAND\` is set, so the feedback path is off.
commands:cd	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:chrome	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:claim-credit	off	44	A promo for credits.
commands:clear	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:cloud-plugins	off	69	Only for cloud sessions, which claudetto does not use.
commands:color	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:commit-push-pr	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:compact	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:config	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:context	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:copy	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:daemon	off	39	Background services and routines that nothing in claudetto needs.
commands:design-consent	off	49	Design product feature, and \`design\` skills are off.
commands:design-login	off	75	Design product feature, and \`design\` skills are off.
commands:design-revoke	off	50	Design product feature, and \`design\` skills are off.
commands:desktop	off	46	Hands the session to Claude Desktop, which claudetto does not use.
commands:diff	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:effort	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:exit	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:export	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:extra-usage	off	25	Old alias of \`/usage-credits\`.
commands:fast	off	45	\`CLAUDE_CODE_DISABLE_FAST_MODE\` is set, so fast mode is off.
commands:feedback	off	50	\`DISABLE_FEEDBACK_COMMAND\` is set, so the feedback path is off.
commands:focus	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:fork	keep	-	Already hidden. Useful for coding.
commands:goal	replace	-	Part 2 of \`builtins-0-2-0\`: the goal engine keeps the name and the form, \`command.run\` answers it so the built-in goal does not start, and \`command.describe\` gives it the menu text.
commands:heapdump	off	84	An internal debug command.
commands:help	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:hooks	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:ide	off	45	IDE auto connect and auto install are off in \`prompt\`.
commands:import	off	75	Imports the config of other agents. claudetto owns the settings.
commands:init	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:insights	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:install	off	41	Native build installer. The user installs Claude Code once.
commands:install-github-app	off	86	Product setup that claudetto does not need.
commands:install-slack-app	off	69	Product setup that claudetto does not need.
commands:keybindings	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:limit-reset	off	44	A promo for a limit reset.
commands:list-agents	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:login	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:logout	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:loops	off	36	\`CLAUDE_CODE_DISABLE_CRON\` is set, so loops are off.
commands:low-priority	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:mcp	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:memory	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:mobile	off	60	A promo for the mobile app.
commands:model	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:output-style	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:passes	off	43	A promo for guest passes.
commands:pause-memory	off	38	\`autoMemoryEnabled\` is \`false\`, so there is no memory to pause.
commands:permissions	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:plan	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:plugin	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:powerup	off	69	Interactive lessons, a promo. claudetto has docs in the wiki.
commands:privacy-settings	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:pro-trial-expired	off	59	A UI for an expired trial, not a command to type.
commands:radio	off	31	A promo for lo-fi radio.
commands:rate-limit-options	off	39	A UI for a rate limit, not a command to type.
commands:recap	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:release-notes	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:reload-plugins	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:reload-skills	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:remote-control	off	39	\`disableRemoteControl\` is \`true\`.
commands:remote-env	off	47	Only for cloud agents, which claudetto does not use.
commands:rename	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:restart	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:resume	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:rewind	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:sandbox	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:scroll-speed	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:session	off	34	Cloud session URL and QR code. Not used.
commands:setup-bedrock	off	64	Provider setup that claudetto does not need.
commands:setup-vertex	off	75	Provider setup that claudetto does not need.
commands:skill-doctor	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:skills	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:status	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:statusline	off	35	Needs the \`statusline-setup\` agent, which claudetto denies. \`statusline\` slice owns the line.
commands:stickers	off	26	A promo for stickers.
commands:stop	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:subtask	keep	-	Already hidden. Useful for coding.
commands:tasks	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:team-onboarding	off	63	A guide from usage for a team, a promo.
commands:teleport	off	60	Moves the session to the cloud, which claudetto does not use.
commands:terminal-setup	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:theme	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:tui	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:ultraplan	off	57	A cloud plan feature that claudetto does not use.
commands:ultrareview	off	34	A cloud paid review. \`/review\` stays.
commands:upgrade	off	51	A promo to upgrade the plan.
commands:usage	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:usage-credits	off	76	A promo for usage credits.
commands:version	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:voice	off	31	Voice mode that claudetto does not use.
commands:web-setup	off	46	Setup for cloud sessions, which claudetto does not use.
commands:wellbeing	off	57	Break reminders that nothing needs.
commands:workflow-launch-exec	off	93	For server-launched sessions only.
commands:workflows	off	38	\`enableWorkflows\` is \`false\`, so the command has no use.
`;
