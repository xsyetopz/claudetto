#!/usr/bin/env node
// Set up OpenSpec for the project.
//
//   node openspec.mjs [--apply]
//
// It prints the OpenSpec state and the steps of `features/setup/openspec.mjs`, and runs nothing without `--apply`.
// It writes no Claude Code setting and no file of its own.

import path from "node:path";
import {
  reportOpenSpec,
  setupOpenSpec,
} from "../../../features/setup/openspec.mjs";

const projectDir = path.resolve(
  process.env.CLAUDE_PROJECT_DIR || process.cwd(),
);
reportOpenSpec(projectDir);
if (!setupOpenSpec(projectDir, process.argv.includes("--apply")))
  process.exitCode = 1;
