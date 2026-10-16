import {
  MEMORY_AFTER_WRITING_THE_FILE,
  MEMORY_BEFORE_SAVING_CHECK_FOR,
  MEMORY_EACH_MEMORY_IS_ONE,
  MEMORY_IF_THE_USER_EXPLICITLY,
  MEMORY_IF_THE_USER_SAYS,
  MEMORY_IN_THE_BODY_LINK,
  MEMORY_KEEP_THE_NAME_DESCRIPTION,
  MEMORY_MARKDOWN_NAME,
  MEMORY_MEMORY_IS_ONE_OF,
  MEMORY_MEMORY_MD_IS_ALWAYS,
  MEMORY_MEMORY_RECORDS_CAN_BECOME,
  MEMORY_MEMORY_THAT_NAMES_SPECIFIC,
  MEMORY_MEMORY_THAT_SUMMARIZES_REPO,
  MEMORY_STEP_GM,
  MEMORY_STEP_GM_2,
  MEMORY_THE_MEMORY_SAYS_EXISTS,
  MEMORY_THESE_EXCLUSIONS_APPLY_EVEN,
  MEMORY_THIS_DIRECTORY_ALREADY_EXISTS,
  MEMORY_TYPES_TYPES,
  MEMORY_TYPES_TYPES_2,
  MEMORY_UPDATE_OR_REMOVE_MEMORIES,
  MEMORY_USER_WHO_THE_USER,
  MEMORY_WHEN_TO_USE_OR,
  MEMORY_YOU_MUST_ACCESS_MEMORY,
  MEMORY_YOU_SHOULD_BUILD_UP,
} from "../prompts.ts";
import { applyParts, type Part } from "./parts.ts";

// The lean text and the full text of the section differ, so each part finds its text in one of them.
export const PARTS: readonly Part[] = [
  {
    anchor: /You have a persistent,? file-based memory(?: system)? at /g,
    text: "Your memory directory is ",
  },
  {
    anchor: /This directory already exists[^\n]*?existence\)\./g,
    text: MEMORY_THIS_DIRECTORY_ALREADY_EXISTS,
  },
  {
    anchor: /Each memory is one file holding one fact[^\n]*/g,
    text: MEMORY_EACH_MEMORY_IS_ONE,
  },
  {
    anchor: /^`user`: who the user is.*$/gm,
    text: MEMORY_USER_WHO_THE_USER,
  },
  {
    anchor: /^In the body, link to related memories.*$/gm,
    text: MEMORY_IN_THE_BODY_LINK,
  },
  {
    anchor: /^After writing the file, add a one-line pointer.*$/gm,
    text: MEMORY_AFTER_WRITING_THE_FILE,
  },
  {
    anchor: /^Before saving, check for an existing file.*$/gm,
    text: MEMORY_BEFORE_SAVING_CHECK_FOR,
  },
  {
    anchor: /^You should build up this memory system.*$/gm,
    text: MEMORY_YOU_SHOULD_BUILD_UP,
  },
  {
    anchor: /^If the user explicitly asks you to remember.*$/gm,
    text: MEMORY_IF_THE_USER_EXPLICITLY,
  },
  {
    anchor: /^There are several discrete types of memory.*$/gm,
    text: "The memory has four types:",
  },
  {
    anchor: /<types>[\s\S]*<\/types>/g,
    text: MEMORY_TYPES_TYPES,
  },
  {
    anchor:
      /^- Code patterns, conventions, architecture.*\n- Git history.*\n- Debugging solutions.*\n- Anything already documented.*\n- Ephemeral task details.*$/gm,
    text: MEMORY_TYPES_TYPES_2,
  },
  {
    anchor: /^These exclusions apply even when.*$/gm,
    text: MEMORY_THESE_EXCLUSIONS_APPLY_EVEN,
  },
  {
    anchor: /```markdown\n---\nname: \{\{[\s\S]*?\n```\n/g,
    text: `${MEMORY_MARKDOWN_NAME}\n`,
  },
  {
    anchor: /^\*\*Step 1\*\*.*$/gm,
    text: MEMORY_STEP_GM,
  },
  {
    anchor: /^\*\*Step 2\*\*.*$/gm,
    text: MEMORY_STEP_GM_2,
  },
  {
    anchor: /^- `MEMORY\.md` is always loaded.*$/gm,
    text: MEMORY_MEMORY_MD_IS_ALWAYS,
  },
  {
    anchor: /^- Keep the name, description, and type fields.*$/gm,
    text: MEMORY_KEEP_THE_NAME_DESCRIPTION,
  },
  {
    anchor: /^- Update or remove memories that turn out.*$/gm,
    text: MEMORY_UPDATE_OR_REMOVE_MEMORIES,
  },
  {
    anchor: /^- Do not write duplicate memories.*$/gm,
    text: "",
  },
  {
    anchor: /^- You MUST access memory.*$/gm,
    text: MEMORY_YOU_MUST_ACCESS_MEMORY,
  },
  {
    anchor: /^- If the user says to \*ignore\*.*$/gm,
    text: MEMORY_IF_THE_USER_SAYS,
  },
  {
    anchor: /^- Memory records can become stale.*$/gm,
    text: MEMORY_MEMORY_RECORDS_CAN_BECOME,
  },
  {
    anchor: /^A memory that names a specific function.*$/gm,
    text: MEMORY_MEMORY_THAT_NAMES_SPECIFIC,
  },
  {
    anchor: /^- If the memory names a file path.*$/gm,
    text: "- For a file path, check that the file exists.",
  },
  {
    anchor: /^- If the memory names a function or flag.*$/gm,
    text: "- For a function or a flag, search for its name.",
  },
  {
    anchor: /^"The memory says X exists".*$/gm,
    text: MEMORY_THE_MEMORY_SAYS_EXISTS,
  },
  {
    anchor: /^A memory that summarizes repo state.*$/gm,
    text: MEMORY_MEMORY_THAT_SUMMARIZES_REPO,
  },
  {
    anchor: /^Memory is one of several persistence.*$/gm,
    text: MEMORY_MEMORY_IS_ONE_OF,
  },
  {
    anchor: /^- When to use or update a plan.*$/gm,
    text: MEMORY_WHEN_TO_USE_OR,
  },
  {
    anchor: /^- When to use or update tasks.*$/gm,
    text: "- Track the steps of the current work in your replies.",
  },
];

export const transform = (text: string): string => applyParts(text, PARTS);
