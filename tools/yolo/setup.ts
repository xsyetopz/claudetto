#!/usr/bin/env bun
// Sets up a vanilla Claude Code install for YOLO mode: auto mode, and the Jev hook on `AskUserQuestion`.
// It changes only `settings.json` in `$CLAUDE_CONFIG_DIR`, or in `~/.claude`, and keeps a backup first.
// Run: bun tools/yolo/setup.ts

import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { applyYolo } from "./settings.ts";

const dir = Bun.env["CLAUDE_CONFIG_DIR"] || join(homedir(), ".claude");
const file = join(dir, "settings.json");
const hook = resolve(import.meta.dir, "hook.ts");

const current = Bun.file(file);
const exists = await current.exists();
const text = exists ? await current.text() : "";
const settings = exists ? (JSON.parse(text) as Record<string, unknown>) : {};
const changes = applyYolo(settings, `bun "${hook}"`);

if (changes.length === 0) {
  console.log(`${file}: no change`);
} else {
  if (exists) {
    const backup = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, "")}`;
    await Bun.write(backup, text);
    console.log(`backup: ${backup}`);
  }
  // `Bun.write` makes the missing folders of the path.
  await Bun.write(file, `${JSON.stringify(settings, null, 2)}\n`);
  console.log(`${file}:`);
  for (const line of changes) console.log(`- ${line}`);
}
if (!Bun.env["TYPESAFE_API_KEY"])
  console.log(
    "TYPESAFE_API_KEY is not set, so the Jev hook does nothing until you set it.",
  );
