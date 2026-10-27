// The verdicts of the commands, written by hand.
// One row for each part: `group:name`, the verdict, the bytes or `-`, and the reason, with a tab between them.

export const COMMANDS = `
commands:add-dir	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:advisor	off	-	The \`advise\` tool went in 0.3.0 (D6 of \`0-3-0\`), and \`CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1\` of the snippet turns the built-in advisor off.
commands:agents	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:artifacts	off	52	\`enableArtifact\` is \`false\`, so \`isEnabled\` is false.
commands:auto-mode-setup	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:autocompact	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:autofix-pr	keep	60	A cloud PR monitor that claudetto does not use. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:background	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:branch	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:brief	keep	22	claudetto sets its own output style in \`styles\`, so the brief toggle has no use. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:btw	keep	-	Already hidden and disabled in this build.
commands:bug	keep	47	\`DISABLE_FEEDBACK_COMMAND\` is set, so the feedback path is off. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:cd	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:chrome	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:claim-credit	keep	44	A promo for credits. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:clear	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:cloud-plugins	keep	69	Only for cloud sessions, which claudetto does not use. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:color	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:commit-push-pr	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:compact	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:config	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:context	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:copy	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:daemon	keep	39	Background services and routines that nothing in claudetto needs. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:design-consent	keep	-	Already hidden in this build.
commands:design-login	keep	75	Design product feature, and \`design\` skills are off. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:design-revoke	keep	-	Already hidden in this build.
commands:desktop	keep	46	Hands the session to Claude Desktop, which claudetto does not use. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:diff	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:effort	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:exit	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:export	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:extra-usage	off	25	\`DISABLE_EXTRA_USAGE_COMMAND\` is set, so \`isEnabled\` is false.
commands:fast	off	45	\`CLAUDE_CODE_DISABLE_FAST_MODE\` is set, so \`isHidden\` is true.
commands:feedback	keep	50	\`DISABLE_FEEDBACK_COMMAND\` is set, so the feedback path is off. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:focus	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:fork	keep	-	Already hidden. Useful for coding.
commands:goal	replace	-	Part 2 of \`builtins-0-2-0\`: the goal engine keeps the name and the form, \`command.run\` answers it so the built-in goal does not start, and \`command.describe\` gives it the menu text.
commands:heapdump	keep	-	Already hidden in this build.
commands:help	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:hooks	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:ide	keep	45	IDE auto connect and auto install are off in \`prompt\`. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:import	keep	75	Imports the config of other agents. claudetto owns the settings. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:init	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:insights	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:install	keep	41	Native build installer. The user installs Claude Code once. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:install-github-app	off	86	\`DISABLE_INSTALL_GITHUB_APP_COMMAND\` is set, so \`isEnabled\` is false.
commands:install-slack-app	keep	69	Product setup that claudetto does not need. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:keybindings	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:limit-reset	keep	44	A promo for a limit reset. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:list-agents	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:login	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:logout	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:loops	keep	-	Already disabled in this build: \`isEnabled\` is always false.
commands:low-priority	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:mcp	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:memory	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:mobile	keep	60	A promo for the mobile app. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:model	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:output-style	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:passes	keep	43	A promo for guest passes. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:pause-memory	keep	-	Already disabled in this build: \`isEnabled\` is always false.
commands:permissions	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:plan	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:plugin	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:powerup	keep	69	Interactive lessons, a promo. claudetto has docs in the wiki. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:privacy-settings	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:pro-trial-expired	keep	-	Already hidden in this build.
commands:radio	keep	31	A promo for lo-fi radio. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:rate-limit-options	keep	39	A UI for a rate limit, not a command to type. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:recap	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:release-notes	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:reload-plugins	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:reload-skills	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:remote-control	off	39	\`disableRemoteControl\` is \`true\`, so \`isHidden\` is true.
commands:remote-env	keep	47	Only for cloud agents, which claudetto does not use. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:rename	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:restart	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:resume	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:rewind	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:sandbox	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:scroll-speed	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:session	keep	34	Cloud session URL and QR code. Not used. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:setup-bedrock	keep	-	Hidden unless \`CLAUDE_CODE_USE_BEDROCK\` is set, and claudetto does not set it.
commands:setup-vertex	keep	-	Hidden unless \`CLAUDE_CODE_USE_VERTEX\` is set, and claudetto does not set it.
commands:skill-doctor	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:skills	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:status	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:statusline	keep	35	Needs the \`statusline-setup\` agent, which claudetto denies. \`statusline\` slice owns the line. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:stickers	keep	26	A promo for stickers. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:stop	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:subtask	keep	-	Already hidden. Useful for coding.
commands:tasks	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:team-onboarding	keep	63	A guide from usage for a team, a promo. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:teleport	keep	60	Moves the session to the cloud, which claudetto does not use. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:terminal-setup	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:theme	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:tui	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:ultraplan	keep	57	A cloud plan feature that claudetto does not use. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:ultrareview	keep	34	A cloud paid review. \`/review\` stays. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:upgrade	keep	51	\`DISABLE_UPGRADE_COMMAND\` works only behind a server gate, so the snippet does not set it (the user, 2026-10-22). The command list is not in the context (fault 30 of \`0-3-0\`).
commands:usage	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:usage-credits	off	76	\`DISABLE_EXTRA_USAGE_COMMAND\` is set, so \`isEnabled\` is false.
commands:version	keep	-	A user needs it for coding or for the session, and no lever makes it better.
commands:voice	keep	31	Voice mode that claudetto does not use. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:web-setup	keep	46	Setup for cloud sessions, which claudetto does not use. It stays in the menu, because the menu is not in the context (fault 30 of \`0-3-0\`).
commands:wellbeing	keep	-	Already disabled in this build: \`isEnabled\` is always false.
commands:workflow-launch-exec	keep	-	Already hidden in this build.
commands:workflows	off	38	\`enableWorkflows\` is \`false\`, so \`isEnabled\` is false.
`;
