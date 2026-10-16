// The reading of MCP tool names (`domain/mcp.ts`).

import { expect, test } from "bun:test";
import { mcpTargetOf } from "../../../src/plugins/claudetto/slices/policy/domain/mcp.ts";

test("a write tool with `owner` and `repo` targets that repository", () => {
  expect(
    mcpTargetOf("mcp__github__create_pull_request", {
      owner: "them",
      repo: "app",
    }),
  ).toEqual({ repo: { host: "github.com", owner: "them", name: "app" } });
});

test("a write tool of a GitHub server with no repository input targets the session", () => {
  expect(mcpTargetOf("mcp__github__create_issue", {})).toBe("session");
  expect(mcpTargetOf("mcp__my-github__addComment", {})).toBe("session");
});

test("a read tool, a built-in tool, and a write tool of another server are no target", () => {
  expect(
    mcpTargetOf("mcp__github__list_issues", { owner: "a", repo: "b" }),
  ).toBeUndefined();
  expect(mcpTargetOf("Write", {})).toBeUndefined();
  expect(mcpTargetOf("mcp__notes__create_note", {})).toBeUndefined();
});
