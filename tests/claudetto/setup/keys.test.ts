// The setup keys of the sandbox, the Bash output limit, `autoMode`, and the drift notice for `env` keys with no effect.

import { expect, test } from "bun:test";
import {
  driftLines,
  idleEnvLines,
} from "../../../plugins/claudetto/slices/setup/domain/drift.ts";
import { SNIPPET } from "../../../plugins/claudetto/slices/setup/domain/merge.ts";
import {
  agentSocketDir,
  planSigningKey,
  signingKeyPath,
  staleAgentSocket,
} from "../../../plugins/claudetto/slices/setup/domain/sandbox.ts";
import { planSettings } from "../../../plugins/claudetto/slices/setup/domain/settings.ts";
import type { Change } from "../../../plugins/claudetto/slices/setup/domain/types.ts";

const ROOT = "/plugins/claudetto";
const noDocs = { withDocs: false };

type Sandbox = {
  filesystem?: { allowWrite?: string[]; allowRead?: string[] };
  network?: { allowUnixSockets?: string[] };
};

test("the snippet lets a package install write the cache of `bun`", () => {
  const sandbox = SNIPPET["sandbox"] as Sandbox;
  expect(sandbox.filesystem?.allowWrite).toContain("~/.bun/install/cache");
});

test("`--apply` keeps the `allowWrite` entries of the user and adds the caches", () => {
  const { settings } = planSettings(
    { sandbox: { filesystem: { allowWrite: ["~/mine"] } } },
    ROOT,
    noDocs,
  );
  const write = (settings["sandbox"] as Sandbox).filesystem?.allowWrite;
  expect(write?.[0]).toBe("~/mine");
  expect(write).toContain("~/.bun/install/cache");
});

test("a signing key file goes to `sandbox.filesystem.allowRead`", () => {
  const { settings, changes } = planSettings({}, ROOT, {
    ...noDocs,
    signingKey: "~/.ssh/id_ed25519.pub",
  });
  expect((settings["sandbox"] as Sandbox).filesystem?.allowRead).toEqual([
    "~/.ssh/id_ed25519.pub",
  ]);
  expect(changes.join("\n")).toContain("sandbox.filesystem.allowRead");
});

test("an absolute signing key path goes to `allowRead` once, also on a second run", () => {
  const key = "/Users/me/.ssh/sign.pub";
  const first = planSettings({}, ROOT, { ...noDocs, signingKey: key });
  const again = planSettings(first.settings, ROOT, {
    ...noDocs,
    signingKey: key,
  });
  expect((again.settings["sandbox"] as Sandbox).filesystem?.allowRead).toEqual([
    key,
  ]);
  expect(again.changes).toEqual([]);
});

test("a literal signing key, a GPG key ID, and no key add no `allowRead`", () => {
  for (const key of [
    "key::ssh-ed25519 AAAA",
    "ssh-ed25519 AAAA",
    "3AA5C34371567BD2",
    undefined,
  ]) {
    expect(signingKeyPath(key)).toBeUndefined();
    const changes: Change[] = [];
    const current = { theme: "dark" };
    expect(planSigningKey(current, key, changes)).toBe(current);
    expect(changes).toEqual([]);
  }
});

test("a private key path gives its `.pub` sibling, so `allowRead` never names the private key", () => {
  for (const [key, want] of [
    ["~/.ssh/id_ed25519", "~/.ssh/id_ed25519.pub"],
    ["/Users/me/.ssh/sign", "/Users/me/.ssh/sign.pub"],
    ["~/.ssh/id_ed25519.pub", "~/.ssh/id_ed25519.pub"],
  ] as const) {
    expect(signingKeyPath(key)).toBe(want);
    const { settings } = planSettings({}, ROOT, { ...noDocs, signingKey: key });
    expect((settings["sandbox"] as Sandbox).filesystem?.allowRead).toEqual([
      want,
    ]);
  }
});

const SOCK = "/private/tmp/com.apple.launchd.AbC/Listeners";
const BOOT = "/var/run/com.apple.launchd.oPAF/Listeners";

test("with a key file, the folder of the agent socket goes to `allowUnixSockets`, and the private key does not go to `allowRead`", () => {
  const key = "~/.ssh/id_ed25519.pub";
  const first = planSettings({}, ROOT, {
    ...noDocs,
    signingKey: key,
    agentSocket: SOCK,
  });
  const sandbox = first.settings["sandbox"] as Sandbox;
  expect(sandbox.network?.allowUnixSockets).toEqual([
    "/private/tmp/com.apple.launchd.AbC",
  ]);
  expect(sandbox.filesystem?.allowRead).toEqual([key]);
  expect(first.changes.join("\n")).toContain(
    "sandbox.network.allowUnixSockets",
  );
  const again = planSettings(first.settings, ROOT, {
    ...noDocs,
    signingKey: key,
    agentSocket: SOCK,
  });
  expect(again.changes).toEqual([]);
});

test("no agent socket, a relative socket, and no key file add no `allowUnixSockets`", () => {
  for (const socket of [undefined, "", "agent.sock"]) {
    expect(agentSocketDir(socket)).toBeUndefined();
    const { settings } = planSettings({}, ROOT, {
      ...noDocs,
      signingKey: "~/.ssh/id_ed25519.pub",
      agentSocket: socket,
    });
    expect(
      (settings["sandbox"] as Sandbox).network?.allowUnixSockets,
    ).toBeUndefined();
  }
  const changes: Change[] = [];
  const current = { theme: "dark" };
  expect(planSigningKey(current, "3AA5C34371567BD2", changes, SOCK)).toBe(
    current,
  );
});

test("the drift check names a launchd socket folder of an earlier boot", () => {
  const settings = {
    sandbox: { network: { allowUnixSockets: [BOOT.slice(0, -10)] } },
  };
  expect(staleAgentSocket(settings, SOCK)).toBe(true);
  expect(driftLines({ settings, agentSocket: SOCK }).join("\n")).toContain(
    "ssh-agent folder of an earlier boot",
  );
  expect(driftLines({ settings, agentSocket: SOCK }).join("\n")).toContain(
    `\`${BOOT.slice(0, -10)}\``,
  );
  expect(staleAgentSocket(settings, BOOT)).toBe(false);
  expect(staleAgentSocket(settings, undefined)).toBe(false);
  expect(
    staleAgentSocket(
      { sandbox: { network: { allowUnixSockets: ["/tmp/x"] } } },
      SOCK,
    ),
  ).toBe(false);
});

test("the snippet sets `bashOutputMaxChars` to the bound of the kernel", async () => {
  const { BASH_OUTPUT_MAX_CHARS } = await import(
    "../../../src/kernel/budget.ts"
  );
  expect(BASH_OUTPUT_MAX_CHARS).toBe(16_000);
  expect(SNIPPET["bashOutputMaxChars"]).toBe(BASH_OUTPUT_MAX_CHARS);
});

test("`autoMode` lists start with `$defaults` in the user scope", () => {
  const { settings } = planSettings({}, ROOT, { ...noDocs, autoMode: true });
  const lists = settings["autoMode"] as Record<string, unknown[]>;
  for (const key of ["soft_deny", "hard_deny"])
    expect(lists[key]?.[0]).toBe("$defaults");
});

test("the drift check names `BASH_OUTPUT_MAX_CHARS` in `env`, because Claude Code does not read it", () => {
  const lines = idleEnvLines({ env: { BASH_OUTPUT_MAX_CHARS: "4000" } });
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain("`BASH_OUTPUT_MAX_CHARS`");
  expect(lines[0]).toContain("`bashOutputMaxChars`");
});

test("the drift check names `CLAUDE_CODE_MAX_CONTEXT_TOKENS` without `DISABLE_COMPACT`", () => {
  for (const env of [
    { CLAUDE_CODE_MAX_CONTEXT_TOKENS: "150000" },
    { CLAUDE_CODE_MAX_CONTEXT_TOKENS: "150000", DISABLE_COMPACT: "0" },
    { CLAUDE_CODE_MAX_CONTEXT_TOKENS: "150000", DISABLE_COMPACT: "false" },
  ]) {
    const lines = idleEnvLines({ env });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("`CLAUDE_CODE_MAX_CONTEXT_TOKENS`");
    expect(lines[0]).toContain("`DISABLE_COMPACT`");
  }
});

test("the drift check is silent when `DISABLE_COMPACT` is on or the keys are absent", () => {
  const env = {
    CLAUDE_CODE_MAX_CONTEXT_TOKENS: "150000",
    DISABLE_COMPACT: "1",
  };
  expect(idleEnvLines({ env })).toEqual([]);
  expect(idleEnvLines({ env: { OTHER: "1" } })).toEqual([]);
  expect(idleEnvLines({})).toEqual([]);
  expect(idleEnvLines(undefined)).toEqual([]);
});

test("`driftLines` includes the lines for an `env` key with no effect", () => {
  const lines = driftLines({
    settings: { env: { BASH_OUTPUT_MAX_CHARS: "4000" } },
  });
  expect(lines.some((l) => l.includes("`BASH_OUTPUT_MAX_CHARS`"))).toBe(true);
});
