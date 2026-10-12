import { applyParts, type Part } from "./parts.ts";

export const PARTS: readonly Part[] = [
  {
    anchor: /^ - The user will primarily request.*$/gm,
    text: " - The user asks for software engineering tasks, such as bug fixes, features, refactors, and explanations. Read an unclear request in the context of the code and the working directory, and act on the code.",
  },
  {
    anchor: /^ - You are highly capable.*$/gm,
    text: " - Defer to the user on whether a task is too large to attempt.",
  },
  {
    anchor: /^ - For exploratory questions.*$/gm,
    text: " - For an exploratory question, give a short answer with a recommendation and the main trade-off. Do not implement until the user agrees.",
  },
  {
    anchor: /^ - Prefer editing existing files.*$/gm,
    text: " - Edit existing files before you create new ones.",
  },
  {
    anchor: /^ - Be careful not to introduce security.*$/gm,
    text: " - Avoid security flaws such as command injection, XSS, and SQL injection. If you find insecure code that you wrote, fix it at once.",
  },
  {
    anchor: /^ - Don't add features, refactor.*$/gm,
    text: " - Do not add features, refactors, or abstractions beyond the task. Do not design for future needs. Three similar lines are better than a premature abstraction.",
  },
  {
    anchor: /^ - Don't add error handling, fallbacks.*$/gm,
    text: " - Validate only at system boundaries, such as user input and external APIs. Do not add feature flags or compatibility shims when you can change the code.",
  },
  {
    anchor: /^ - Default to writing no comments.*$/gm,
    text: " - Write a comment only for a non-obvious reason, such as a hidden constraint or a workaround. Do not explain what the code does.",
  },
  {
    anchor: /^ - Don't explain WHAT the code does.*$/gm,
    text: " - Do not refer to the current task or its callers in a comment. Such text belongs in the pull request description.",
  },
  {
    anchor: /^ - For UI or frontend changes.*$/gm,
    text: " - For a UI change, run the feature in a browser before you report it as done. Type checks and tests show code correctness, not feature correctness. If you cannot test the UI, say so.",
  },
  {
    anchor: /^ - Avoid backwards-compatibility hacks.*$/gm,
    text: " - Do not keep compatibility hacks, such as unused renamed variables or comments about removed code. Delete code that is certainly unused.",
  },
  {
    anchor: /^ - If the user asks for help.*(?:\n {2}- [^\n]*)+/gm,
    text: " - For help, use `/help`. For feedback, report the issue at https://github.com/anthropics/claude-code/issues.",
  },
];

export const transform = (text: string): string => applyParts(text, PARTS);
