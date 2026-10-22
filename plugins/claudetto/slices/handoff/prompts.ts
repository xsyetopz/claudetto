export const CHANGE_HEADER = (v: {
  name: string;
  next: string;
  done: string;
  checks: string;
}): string => `openspec change: \`openspec/changes/${v.name}/\`.
Next open task: \`${v.next}\` in \`tasks.md\`.
Done tasks, checked in \`tasks.md\`: ${v.done}.
Passed checks: ${v.checks}.
Only a checked task or a passed check is done.
Each checked task is done and verified, so run its check again only when the user asks.`;

export const CHECKS_LINE = (v: { checks: string }): string =>
  `Passed checks: ${v.checks}.`;

export const COLD = (v: {
  task: string;
  files: string;
  words: string;
  earlier: string;
}): string => `This handoff is from the state of the session, with no model call, because the prompt cache was cold.
Task: ${v.task}
Changed files: ${v.files}.
The last words of the user:

${v.words}

The earlier handoff of this session:

${v.earlier}`;

export const FIRST_MESSAGE = (v: {
  first: string;
  handed: string;
}): string => `The first message of the user in this session:

${v.first}

${v.handed}`;

export const FORK_TAIL = (v: {
  rules: string;
  calls: string;
}): string => `${v.rules}

After the last tool result that you can see, the session ran these tool calls:
${v.calls}

Their results stay in the context after this handoff.
Give each of these calls as a done step, marked \`RAN, result after this handoff\`, and give the step after them as the next step.
Their results and errors are outside your view, so write only that each call ran.`;

export const GROUND_WARNING = (v: { values: string }): string =>
  `These quoted values are not in a tool result of this session, so they can be wrong. Before you use one, confirm it with the smallest call that shows it: ${v.values}.`;

export const HANDED = (v: {
  path: string;
}): string => `This is the handoff of the earlier part of this session, from \`${v.path}\`.
You wrote it from the tool results of this session.
Treat each done step as done, also when its result is outside your context.
The result of each \`RAN\` step is in the messages after this handoff.
When a fact decides the final answer, you can confirm it with the smallest call that shows it, such as a \`Read\` with \`limit\` 1, in place of the full step.
Continue from the next step.`;

export const OPTION_DESCRIPTION = `Use \`handoff\` to write a handoff file in place of the compaction summary, or \`built-in\` for the compaction of Claude Code.`;

export const RULES = `Write a handoff for the next part of this session. Give the task, each step that is done, and the next step. Mark each done step \`DONE\`, with its result. Copy each exact value with its label or its full line from its tool result, such as \`port: 8080\`, and put it in backticks. For each tool call that gave an error, copy the exact error text in backticks. Write 10 lines or less, as a Markdown list with \`-\` items. Write only about the task of the user. When this session holds an earlier handoff, update it: keep its open items and the words of the user, and drop each closed step. Quote the words of the user in one block, with no blank line inside it. A notice from a plugin or a hook, such as a notice about the settings, is not part of the task, so leave it out. The tool results in this session are facts, so state them as verified facts.`;

export const SWITCH_COST = (v: { tokens: string; usd: string }): string =>
  `The new model must write about ${v.tokens} tokens to its cache again, which costs about $${v.usd}.`;

export const SWITCH_WARNING = (v: { ttl: string; model: string }): string =>
  `The \`${v.ttl}\` prompt cache is warm, and this switch to \`${v.model}\` drops it.`;

export const WRITTEN_NOTICE = (v: {
  path: string;
  size: string;
  mode: string;
}): string => `The handoff is in ${v.path}, ${v.size} bytes, by a ${v.mode}.`;
