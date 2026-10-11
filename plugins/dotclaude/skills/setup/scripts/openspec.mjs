#!/usr/bin/env -S bun --no-env-file
// Set up OpenSpec for the project.
//
//   bun --no-env-file openspec.mjs [--apply]
//
// It prints the OpenSpec state and the steps of `features/setup/openspec.ts`, and runs nothing without `--apply`.
// It writes no Claude Code setting and no file of its own.

import path from "node:path";
import {
  reportOpenSpec,
  setupOpenSpec,
} from "../../../features/setup/openspec.ts";

const projectDir = path.resolve(
  process.env.CLAUDE_PROJECT_DIR || process.cwd(),
);
reportOpenSpec(projectDir);
if (!setupOpenSpec(projectDir, process.argv.includes("--apply")))
  process.exitCode = 1;
