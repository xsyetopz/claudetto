const input = JSON.parse(await Bun.stdin.text()) as { hook_event_name: string };

console.log(
	JSON.stringify({
		hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: {{json context}} },
	}),
);
