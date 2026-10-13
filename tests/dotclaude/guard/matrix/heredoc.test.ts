// The heredoc bodies of the `guard` slice: an unquoted body runs its substitutions, and its text is data.
// A destructive command in a substitution is denied in the main session and a subagent alike.
// The commands are strings for `onBashCall`, and no command runs.

import { expect, test } from "bun:test";
import { main, mainDeny, subagentDeny } from "../ports.ts";

test("a destructive command in a substitution of an unquoted heredoc body is denied, in the main session and a subagent", async () => {
  for (const command of [
    "cat <<EOF\n$(git reset --hard)\nEOF",
    "cat <<EOF\nhi $(git reset --hard)\nEOF",
    "cat <<EOF\n`git reset --hard`\nEOF",
    "cat <<EOF\nx $(rm -rf /) y\nEOF",
  ]) {
    expect(await mainDeny(command, main), command).not.toBeNull();
    expect(await subagentDeny(command, main), command).not.toBeNull();
  }
});

test("a harmless unquoted heredoc is allowed, and the words of its body are not commands", async () => {
  for (const command of [
    "cat <<EOF\nhi there\nEOF",
    "cat <<EOF\ngit reset --hard\nEOF",
    "cat <<EOF\nhi $(date)\nEOF",
  ]) {
    expect(await mainDeny(command, main), command).toBeNull();
  }
});
