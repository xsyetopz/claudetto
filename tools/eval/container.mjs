// The container side of the harness: image, runner, and oracle exec.
// Every function here needs Docker, so the unit tests build the argument
// lists only and use a fake runner for the rest.

import { spawn as nodeSpawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  EVAL_RUN_TIMEOUT_S,
  EVAL_STDERR_CHARS,
  EVAL_STDOUT_TAIL_CHARS,
} from "../limits.mjs";
import { PATHS } from "./arms.mjs";
import { parseEvents, ScriptedUser } from "./stream.mjs";

/**
 * The image of a Claude Code version and a Dockerfile.
 * The hash of the Dockerfile is in the tag, so that a changed Dockerfile builds a new image.
 */
export const imageTag = (version, dockerfile) =>
  `dotclaude-eval:${version}-${createHash("sha256").update(dockerfile).digest("hex").slice(0, 12)}`;

const shq = (s) => `'${String(s).replaceAll("'", `'\\''`)}'`;

/**
 * The `docker run` arguments of a run.
 * Each secret goes in by name (`-e NAME`), so that no value is in the argument list.
 * The container has a `name`, so that a timeout can stop it with `docker kill`.
 * `pluginsDir` is the repository root, and only its `.claude-plugin` and `plugins` folders are mounted,
 * because the root also holds `.env` and the hidden cases in `evals/`.
 */
export function dockerArgs({
  name,
  image,
  workDir,
  configDir,
  harnessDir,
  pluginsDir,
  plan,
  secrets = ["CLAUDE_CODE_OAUTH_TOKEN"],
}) {
  const env = Object.entries(plan.env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
  const script = [
    ...plan.setup,
    `exec claude ${plan.args.map(shq).join(" ")}`,
  ].join(" && ");
  return [
    "run",
    "--rm",
    "--name",
    name,
    "-i",
    ...secrets.flatMap((k) => ["-e", k]),
    ...env,
    "-v",
    `${workDir}:${PATHS.work}`,
    "-v",
    `${configDir}:${PATHS.config}`,
    "-v",
    `${harnessDir}:/harness:ro`,
    "-v",
    `${path.join(pluginsDir, ".claude-plugin")}:${PATHS.plugins}/.claude-plugin:ro`,
    "-v",
    `${path.join(pluginsDir, "plugins")}:${PATHS.plugins}/plugins:ro`,
    "-w",
    PATHS.work,
    image,
    "sh",
    "-c",
    script,
  ];
}

/** Writes the harness files that the container reads. Returns the folder. */
function writeHarness(job, tmp) {
  const dir = fs.mkdtempSync(path.join(tmp, "eval-harness-"));
  fs.writeFileSync(path.join(dir, "hook.mjs"), job.hookScript);
  fs.writeFileSync(path.join(dir, "rules.json"), JSON.stringify(job.rules));
  fs.writeFileSync(
    path.join(dir, "settings.json"),
    JSON.stringify(job.settings),
  );
  if (job.variantPath)
    fs.copyFileSync(job.variantPath, path.join(dir, "variant.md"));
  if (job.stylePath) fs.copyFileSync(job.stylePath, path.join(dir, "style.md"));
  return dir;
}

const userLine = (text) =>
  `${JSON.stringify({ type: "user", message: { role: "user", content: text } })}\n`;

/**
 * The container runner. `cfg`: `image`, `pluginsDir`, `secrets` (`{NAME: value}`, such as the token),
 * `timeoutS`, and `spawn` (a fake in the unit tests). Sends the prompt, then each claim after its turn.
 */
export function dockerRunner(cfg) {
  return (job) =>
    new Promise((resolve) => {
      const harnessDir = writeHarness(job, os.tmpdir());
      const name = `dotclaude-eval-${randomUUID()}`;
      const args = dockerArgs({
        name,
        image: cfg.image,
        workDir: job.workDir,
        configDir: job.configDir,
        harnessDir,
        pluginsDir: cfg.pluginsDir,
        plan: job.plan,
        secrets: Object.keys(cfg.secrets),
      });
      const spawn = cfg.spawn ?? nodeSpawn;
      const child = spawn("docker", args, {
        env: { ...process.env, ...cfg.secrets },
        stdio: ["pipe", "pipe", "pipe"],
      });
      const user = new ScriptedUser(job.claims);
      let buf = "";
      let timedOut = false;
      let stderr = "";
      let stdoutTail = "";
      const lines = [];
      const timer = setTimeout(
        () => {
          timedOut = true;
          // `SIGKILL` stops the `docker` client only, so the container is killed by name.
          spawn("docker", ["kill", name], { stdio: "ignore" });
          child.kill("SIGKILL");
        },
        (cfg.timeoutS ?? EVAL_RUN_TIMEOUT_S) * 1000,
      );
      child.stdin.write(userLine(job.prompt));
      child.stdout.setEncoding("utf8");
      // The first part of stderr and the last part of stdout stay in the record, as the cause of an invalid run.
      child.stderr?.setEncoding("utf8");
      child.stderr?.on("data", (d) => {
        if (stderr.length < EVAL_STDERR_CHARS)
          stderr = (stderr + d).slice(0, EVAL_STDERR_CHARS);
      });
      child.stdout.on("data", (d) => {
        stdoutTail = (stdoutTail + d).slice(-EVAL_STDOUT_TAIL_CHARS);
        buf += d;
        const parts = buf.split("\n");
        buf = parts.pop();
        for (const line of parts) {
          lines.push(line);
          const [ev] = parseEvents(line);
          if (!ev) continue;
          for (const m of user.onEvent(ev)) child.stdin.write(userLine(m));
          if (ev.type === "result") {
            if (user.pending.length)
              child.stdin.write(userLine(user.pending.shift().text));
            else child.stdin.end();
          }
        }
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        fs.rmSync(harnessDir, { recursive: true, force: true });
        resolve({
          events: parseEvents(lines.join("\n")),
          exitCode: code,
          timedOut,
          stderr,
          stdoutTail,
        });
      });
    });
}

/** The oracle exec: runs `cmd` in the work folder inside the container, with no network. */
export function dockerExec(image) {
  return (cmd, workDir) =>
    spawnSync(
      "docker",
      [
        "run",
        "--rm",
        "--network",
        "none",
        "-v",
        `${workDir}:${PATHS.work}`,
        "-w",
        PATHS.work,
        image,
        ...cmd,
      ],
      { stdio: "ignore" },
    ).status ?? 1;
}

/** The version of Claude Code in the image, or null. Needs Docker. */
export function imageVersion(image) {
  const r = spawnSync("docker", ["run", "--rm", image, "claude", "--version"], {
    encoding: "utf8",
  });
  return r.status === 0 ? r.stdout.trim().split(/\s+/)[0] : null;
}

export const dockerReachable = () =>
  spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
