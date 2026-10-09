// The container gets the marketplace file and the plugins only, and a changed Dockerfile gives a new image tag.

import { expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { armPlan } from "../../tools/eval/arms.mjs";
import {
  dockerArgs,
  dockerRunner,
  imageTag,
} from "../../tools/eval/container.mjs";

const mounts = (args) =>
  args.flatMap((a, i) => (args[i - 1] === "-v" ? [a] : []));

test("the container mounts `.claude-plugin` and `plugins` of the repository, and not the repository root", () => {
  const args = dockerArgs({
    name: "n",
    image: "i",
    workDir: "/w",
    configDir: "/c",
    harnessDir: "/h",
    pluginsDir: "/repo",
    plan: armPlan("dotclaude", { model: "sonnet" }),
  });
  const m = mounts(args);
  expect(m).toContain("/repo/.claude-plugin:/plugins-src/.claude-plugin:ro");
  expect(m).toContain("/repo/plugins:/plugins-src/plugins:ro");
  // The root holds `.env` and the hidden cases in `evals/`, so no mount gives it.
  expect(m.some((v) => v.startsWith("/repo:"))).toBe(false);
});

test("the image tag has the Claude Code version and a hash of the Dockerfile", () => {
  const a = imageTag("2.1.295", "FROM node:22-slim\nUSER node\n");
  const b = imageTag("2.1.295", "FROM node:22-slim\n");
  expect(a).toMatch(/^dotclaude-eval:2\.1\.295-[0-9a-f]{12}$/);
  expect(a).not.toBe(b);
  expect(imageTag("2.1.295", "FROM node:22-slim\n")).toBe(b);
});

test("each secret goes in by name, and no value is in the arguments", () => {
  const args = dockerArgs({
    name: "n",
    image: "i",
    workDir: "/w",
    configDir: "/c",
    harnessDir: "/h",
    pluginsDir: "/repo",
    plan: armPlan("dotclaude", { model: "sonnet" }),
    secrets: ["CLAUDE_CODE_OAUTH_TOKEN", "TYPESAFE_API_KEY"],
  });
  const named = args.flatMap((a, i) => (args[i - 1] === "-e" ? [a] : []));
  expect(named).toContain("CLAUDE_CODE_OAUTH_TOKEN");
  expect(named).toContain("TYPESAFE_API_KEY");
  expect(args.some((a) => a.includes("TYPESAFE_API_KEY="))).toBe(false);
});

test("the runner gives each secret value to `docker` in its env", async () => {
  let seen;
  const spawn = (_cmd, args, opts) => {
    seen = { args, env: opts.env };
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.kill = () => {};
    queueMicrotask(() => child.emit("close", 0));
    return child;
  };
  const secrets = { CLAUDE_CODE_OAUTH_TOKEN: "t", TYPESAFE_API_KEY: "k" };
  await dockerRunner({ image: "i", pluginsDir: "/p", secrets, spawn })({
    workDir: "/w",
    configDir: "/c",
    hookScript: "",
    rules: {},
    settings: {},
    claims: [],
    prompt: "p",
    plan: { env: {}, setup: [], args: [] },
  });
  expect(seen.env.TYPESAFE_API_KEY).toBe("k");
  expect(seen.args).toContain("TYPESAFE_API_KEY");
  expect(seen.args).not.toContain("k");
});
