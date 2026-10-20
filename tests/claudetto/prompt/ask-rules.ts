// The `permissions.ask` rules of the snippet that start with a prefix, and a test of a command against them.

import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import { matchingRules } from "../../support/bash-rules.ts";

const ASK = (SNIPPET as { permissions: { ask: string[] } }).permissions.ask;

/** A test of a command against the ask rules that start with `prefix`, such as `Bash(rm `. */
export const askMatcher = (prefix: string) => {
  const rules = ASK.filter((rule) => rule.startsWith(prefix));
  return (command: string): boolean => matchingRules(rules, command).length > 0;
};
