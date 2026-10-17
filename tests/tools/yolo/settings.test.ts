import { describe, expect, test } from "bun:test";
import { applyYolo, HOOK_MARK } from "../../../tools/yolo/settings.ts";

const COMMAND = `bun "/repo/${HOOK_MARK}"`;

type Settings = Record<string, unknown> & {
  permissions?: Record<string, unknown>;
  hooks?: Record<string, { matcher?: string; hooks: { command?: string }[] }[]>;
};

describe("applyYolo", () => {
  test("starts each session in auto mode with no opt-in dialog", () => {
    const s: Settings = {};
    applyYolo(s, COMMAND);
    expect(s.permissions?.["defaultMode"]).toBe("auto");
    expect(s["skipAutoPermissionPrompt"]).toBe(true);
  });

  test("removes `disableAutoMode`, because it turns auto mode off", () => {
    const s: Settings = { permissions: { disableAutoMode: "disable" } };
    const changes = applyYolo(s, COMMAND);
    expect(s.permissions?.["disableAutoMode"]).toBeUndefined();
    expect(changes).toContain("permissions.disableAutoMode removed");
  });

  test("adds one `PreToolUse` hook on `AskUserQuestion` that runs the Jev hook", () => {
    const s: Settings = {};
    applyYolo(s, COMMAND);
    const entries = s.hooks?.["PreToolUse"] ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0]?.matcher).toBe("AskUserQuestion");
    expect(entries[0]?.hooks[0]?.command).toBe(COMMAND);
  });

  test("replaces its own hook on a second run, and keeps the hooks of the user", () => {
    const own = {
      matcher: "Bash",
      hooks: [{ type: "command", command: "echo mine" }],
    };
    const s: Settings = { hooks: { PreToolUse: [own] } };
    applyYolo(s, `bun "/old/${HOOK_MARK}"`);
    applyYolo(s, COMMAND);
    const entries = s.hooks?.["PreToolUse"] ?? [];
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(own);
    expect(entries[1]?.hooks[0]?.command).toBe(COMMAND);
  });

  test("gives no change when the settings already have each value", () => {
    const s: Settings = {};
    applyYolo(s, COMMAND);
    expect(applyYolo(s, COMMAND)).toEqual([]);
  });

  test("keeps each other key of the settings", () => {
    const s: Settings = { model: "opus", permissions: { allow: ["Bash(ls)"] } };
    applyYolo(s, COMMAND);
    expect(s["model"]).toBe("opus");
    expect(s.permissions?.["allow"]).toEqual(["Bash(ls)"]);
  });
});
