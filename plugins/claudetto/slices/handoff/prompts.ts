export const CHANGE_HEADER = (v: {
  name: string;
  next: string;
  done: string;
  unproved: string;
  checks: string;
}): string => `openspec change: \`openspec/changes/${v.name}/\`.
Next open task: \`${v.next}\` in \`tasks.md\`.
Done tasks, checked in \`tasks.md\` with a passed check: ${v.done}.
Open tasks, checked in \`tasks.md\` with no passed check: ${v.unproved}.
Passed checks: ${v.checks}.
A task is done when its box is checked and a passed check is in the list above.
A box with no passed check is open, so run its check before you build on it.`;

export const CHECKS_LINE = (v: { checks: string }): string =>
  `Passed checks: ${v.checks}.`;

export const HANDOVER = (v: {
  task: string;
  files: string;
  decisions: string;
  ruledOut: string;
  values: string;
  usage: string;
  words: string;
  earlier: string;
}): string => `This handoff is from the state of the session, with no model call.
Task: ${v.task}
Changed files: ${v.files}.
Decisions of the user: ${v.decisions}.
Options that the user ruled out: ${v.ruledOut}.
Values of the user: ${v.values}.
Usage: ${v.usage}
The last words of the user, which show the intent, so that a file gets the intent as you understand it:

${v.words}

The earlier handoff of this session:

${v.earlier}`;

/** The instructions of `/compact`: the summary keeps the facts that a handover keeps. */
export const COMPACT_KEEP = (v: { text: string }): string =>
  `Keep each fact below in the summary as it is, because the session continues from them.

${v.text}`;

export const HANDOVER_HELD = (v: { prompt: string }): string =>
  `The user wrote this prompt before claudetto cleared or compacted the context, and claudetto held it until that was complete. It is the newest prompt of the user:

${v.prompt}`;

export const HANDOVER_NOTICE = (v: { file: string }): string =>
  `Handover: the handoff is in ${v.file}, then the session clears and resumes on it.`;

export const OFFER_QUESTION = `The prompt cache is cold, so the next request pays the full price of the context. A handover clears the context and resumes on a short handoff file. Is a handover better than a continued session, given the size of the context and the open task?`;

export const OFFER_STATE = (v: {
  tokens: string;
  idle: string;
  ttl: string;
  task: string;
}): string => `Context: ${v.tokens} tokens.
Idle: ${v.idle}. The prompt cache lasts ${v.ttl} minutes, so it is cold.
Open task: ${v.task}`;

export const HANDOVER_OFFER = (v: { minutes: string }): string =>
  `The last answer was more than ${v.minutes} minutes ago, so the prompt cache is cold. Hand the session over to a fresh context with a handoff file?`;

export const HANDOVER_OFFER_RESUMED = `This session was resumed, so the time of the last answer is not known, and the prompt cache can be cold. Hand the session over to a fresh context with a handoff file?`;

export const HANDOVER_HELD_NOTICE = "The prompt runs after the handover.";

export const HANDOVER_RESUME = (v: {
  path: string;
}): string => `This is the handoff of the earlier part of this session, from \`${v.path}\`.
The session was cleared, and the old session stays on disk for \`/resume\`.
A code built the handoff from the state of the session, so it has no model summary.
Treat a task as done only when the handoff lists it as done.
Continue from the next open task.`;

export const OPTION_DESCRIPTION = `Use \`auto\` to pick a handover or a compaction for each case from the table, \`handover\` to hand over at each trigger, or \`built-in\` for the compaction of Claude Code.`;

export const SWITCH_COST = (v: { tokens: string; usd: string }): string =>
  `The new model must write about ${v.tokens} tokens to its cache again, which costs about $${v.usd}.`;

export const SWITCH_WARNING = (v: { ttl: string; model: string }): string =>
  `The \`${v.ttl}\` prompt cache is warm, and this switch to \`${v.model}\` drops it.`;
