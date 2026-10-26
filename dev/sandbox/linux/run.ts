// `just sandbox-linux`: one live session of Claude Code in a Linux container,
// to check that the seccomp helper of the native build blocks a Unix socket in a sandboxed `Bash` call (D51).
// The login of the host goes to the container on stdin: from the Keychain on macOS, or from `.credentials.json` on Linux.
// No file of the host gets the login, and the container, which `--rm` removes, deletes it at the end.
// The socket is a fake agent of `socat` in the container, and not the `ssh-agent` of the host.
// `--privileged` lets `bwrap` make its namespaces in the container.
// The run costs one short session on `LINUX_SESSION_MODEL`.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { $ } from "bun";
import {
  DOCKER_CPUS,
  LINUX_SESSION_MODEL,
  LINUX_TOKEN_MIN_MINUTES,
} from "../../../tools/limits.ts";
import { must, recipe } from "../../../tools/recipes.ts";
import { checkImage } from "../../docker/image.ts";
import { parseSession, tokenMinutes, verdict } from "./result.ts";

const DIR = import.meta.dir;
const SETTINGS = JSON.stringify({
  sandbox: {
    enabled: true,
    failIfUnavailable: true,
    allowUnsandboxedCommands: false,
    autoAllowBashIfSandboxed: true,
  },
});
const PROMPT =
  'Run this exact command with the Bash tool one time, and then reply with its output: echo | socat - UNIX-CONNECT:"$SSH_AUTH_SOCK"; echo "exit=$?"';

/** The login of the host. The text of a failed read is not printed, because it can hold a part of the login. */
const login = async (): Promise<string> => {
  if (process.platform !== "darwin") {
    const dir =
      process.env["CLAUDE_CONFIG_DIR"] ?? path.join(os.homedir(), ".claude");
    return Bun.file(path.join(dir, ".credentials.json")).text();
  }
  const out =
    await $`security find-generic-password -s ${"Claude Code-credentials"} -w`
      .quiet()
      .nothrow();
  if (out.exitCode !== 0)
    throw new Error("The Keychain has no item `Claude Code-credentials`.");
  return out.stdout.toString().trim();
};

const read = async (dir: string, name: string): Promise<string> => {
  const file = Bun.file(path.join(dir, name));
  return (await file.exists()) ? file.text() : "";
};

await recipe(async () => {
  const base = await checkImage();
  const image = `claudetto-sandbox-linux:${base.slice(base.indexOf(":") + 1)}`;
  await must(
    $`docker build --quiet --tag ${image} --build-arg BASE=${base} ${DIR}`.quiet(),
  );
  const credentials = await login();
  const minutes = tokenMinutes(credentials, Date.now());
  if (minutes === undefined || minutes < LINUX_TOKEN_MIN_MINUTES) {
    console.error(
      `The access token has ${minutes ?? "no"} minutes left, and the bound is ${LINUX_TOKEN_MIN_MINUTES}.\nA refresh in the container makes the login of the host fail, so run one \`claude\` command on the host to refresh it, and then run this recipe again.`,
    );
    process.exit(1);
  }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-linux-"));
  try {
    await must(
      $`docker run --rm -i --privileged --cpus ${DOCKER_CPUS} --env SETTINGS=${SETTINGS} --env PROMPT=${PROMPT} --env MODEL=${LINUX_SESSION_MODEL} --volume ${path.join(DIR, "check.sh")}:/check.sh:ro --volume ${out}:/out ${image} sh /check.sh < ${Buffer.from(credentials)}`,
    );
    const control = await read(out, "control.txt");
    const session = parseSession(await read(out, "out.jsonl"));
    const result = verdict(control, session);
    console.log(
      `claude in the container: ${(await read(out, "claude.txt")).trim()}`,
    );
    console.log(`control, with no sandbox: ${control.trim()}`);
    for (const c of session.commands) console.log(`Bash command: ${c}`);
    for (const r of session.results) console.log(`tool result: ${r.trim()}`);
    console.log("sandbox lines of stderr (`SRT_DEBUG`):");
    console.log(
      (await read(out, "sandbox.txt")).split("\n").slice(0, 20).join("\n"),
    );
    if (session.results.length === 0)
      console.log(
        (await read(out, "stderr.txt")).split("\n").slice(-20).join("\n"),
      );
    console.log(
      `result: ${session.subtype ?? "none"}, total_cost_usd: ${session.cost ?? "none"}`,
    );
    console.log(`verdict: ${result}`);
    if (result !== "blocked") process.exit(1);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
