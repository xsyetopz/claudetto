{
	"$schema": "https://clawdipedia.cc/schemas/claude-code-plugin-hooks.json",
	"hooks": {
		"UserPromptSubmit": [
			{
				"hooks": [{ "type": "command", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/prompt.ts\"" }]
			}
		]
	}
}
