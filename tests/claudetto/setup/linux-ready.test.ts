// The Linux and WSL2 checks of the hard stop: the rules of `domain/linux-sandbox.ts`, and the lookups of `adapters/linux-ready.ts`.
// The lookups run with temporary folders and fake programs on `PATH`, so no run reads the real home or the real global `npm` folder.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  type LinuxProbe,
  linuxReady,
  thisProbe,
} from "../../../plugins/claudetto/slices/setup/adapters/linux-ready.ts";
import {
  apparmorProfile,
  blockedKindOf,
  globalBases,
  helperIn,
  linuxSettingsOf,
  seccompArchOf,
} from "../../../plugins/claudetto/slices/setup/domain/linux-sandbox.ts";
import { writeProgram } from "../../support/fake-program.ts";
import { tmpDir } from "../../support/repo.ts";

test("a higher scope replaces a lower one for each Linux key", () => {
  const cfg = linuxSettingsOf([
    {
      file: "user",
      settings: { sandbox: { bwrapPath: "/a", seccomp: { applyPath: "/s" } } },
    },
    { file: "project", settings: { sandbox: { bwrapPath: "/b" } } },
    {
      file: "local",
      settings: { sandbox: { seccomp: { argv0: "apply-seccomp" } } },
    },
  ]);
  expect(cfg).toStrictEqual({
    bwrapPath: "/b",
    applyPath: "/s",
    argv0: "apply-seccomp",
    allUnixSockets: undefined,
  });
});

test("`allowAllUnixSockets` names the file of the last value, and `false` clears it", () => {
  const on = { sandbox: { network: { allowAllUnixSockets: true } } };
  const off = { sandbox: { network: { allowAllUnixSockets: false } } };
  expect(linuxSettingsOf([{ file: "user", settings: on }]).allUnixSockets).toBe(
    "user",
  );
  expect(
    linuxSettingsOf([
      { file: "user", settings: on },
      { file: "local", settings: off },
    ]).allUnixSockets,
  ).toBeUndefined();
  expect(
    linuxSettingsOf([{ file: "x", settings: "no" }]).bwrapPath,
  ).toBeUndefined();
});

test("the filter has a build for `x64` and `arm64` only", () => {
  expect(seccompArchOf("x64")).toBe("x64");
  expect(seccompArchOf("arm64")).toBe("arm64");
  expect(seccompArchOf("ia32")).toBeUndefined();
  expect(seccompArchOf("riscv64")).toBeUndefined();
});

test("the global bases start with the `npm root -g` folder and then the fixed folders", () => {
  const bases = globalBases("/n/lib/node_modules\n", "/home/u", path.join);
  expect(bases[0]).toBe("/n/lib/node_modules/@anthropic-ai/sandbox-runtime");
  expect(bases).toHaveLength(6);
  expect(globalBases(undefined, "/home/u", path.join)).toHaveLength(5);
  expect(bases.at(-1)).toBe(
    "/home/u/.npm-global/lib/node_modules/@anthropic-ai/sandbox-runtime",
  );
  expect(helperIn("/b", "arm64", path.join)).toBe(
    "/b/vendor/seccomp/arm64/apply-seccomp",
  );
});

test("only the documented error of a container counts as a container", () => {
  expect(
    blockedKindOf(
      "bwrap: Can't mount proc on /newroot/proc: Operation not permitted",
    ),
  ).toBe("container");
  expect(blockedKindOf("bwrap: setting up uid map: Permission denied")).toBe(
    "other",
  );
  expect(blockedKindOf("Operation not permitted")).toBe("other");
});

test("the AppArmor profile names the path that it gets", () => {
  expect(apparmorProfile("/home/linuxbrew/.linuxbrew/bin/bwrap")).toBe(
    "profile bwrap /home/linuxbrew/.linuxbrew/bin/bwrap flags=(unconfined) {\n  userns,\n  include if exists <local/bwrap>\n}",
  );
});

/** A folder with a fake `bwrap` that works and, when `npmRoot` is set, a fake `npm` that prints it. */
const world = async (npmRoot?: string) => {
  const dir = tmpDir("dc-linux");
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  await writeProgram(bin, "bwrap", "");
  if (npmRoot !== undefined)
    await writeProgram(bin, "npm", `console.log(${JSON.stringify(npmRoot)});`);
  const lines: string[] = [];
  const io = {
    log: (l: string) => lines.push(l),
    error: (l: string) => lines.push(l),
  };
  const env = { HOME: path.join(dir, "home"), PATH: bin };
  return { dir, env, io, lines };
};

const cfg = linuxSettingsOf([]);
const probeOf = (exists: LinuxProbe["exists"]): LinuxProbe => ({
  arch: "x64",
  exists,
  appArmorRestricted: async () => false,
  isElf: async () => false,
});

test("the helper in the folder of `npm root -g` passes the check", async () => {
  const w = await world("/fake-root/lib/node_modules");
  const want =
    "/fake-root/lib/node_modules/@anthropic-ai/sandbox-runtime/vendor/seccomp/x64/apply-seccomp";
  expect(
    await linuxReady(
      cfg,
      w.env,
      w.io,
      probeOf((f) => f === want),
    ),
  ).toBe(true);
  expect(
    await linuxReady(
      cfg,
      w.env,
      w.io,
      probeOf(() => false),
    ),
  ).toBe(false);
});

test("the helper in a folder of the home passes the check, and the one for another arch does not", async () => {
  const w = await world();
  const home = `${w.env.HOME}/.npm-global/lib/node_modules/@anthropic-ai/sandbox-runtime/vendor/seccomp`;
  const probe = (arch: string) => ({
    ...probeOf((f) => f === `${home}/${arch}/apply-seccomp`),
    arch: "arm64",
  });
  expect(await linuxReady(cfg, w.env, w.io, probe("arm64"))).toBe(true);
  expect(await linuxReady(cfg, w.env, w.io, probe("x64"))).toBe(false);
});

test("`sandbox.seccomp.applyPath` passes only when the file exists, and `argv0` passes with the path as it is", async () => {
  const w = await world();
  const withPath = linuxSettingsOf([
    {
      file: "f",
      settings: { sandbox: { seccomp: { applyPath: "/x/apply" } } },
    },
  ]);
  expect(
    await linuxReady(
      withPath,
      w.env,
      w.io,
      probeOf((f) => f === "/x/apply"),
    ),
  ).toBe(true);
  expect(
    await linuxReady(
      withPath,
      w.env,
      w.io,
      probeOf(() => false),
    ),
  ).toBe(false);
  const multicall = linuxSettingsOf([
    {
      file: "f",
      settings: {
        sandbox: {
          seccomp: { applyPath: "/x/claude", argv0: "apply-seccomp" },
        },
      },
    },
  ]);
  expect(
    await linuxReady(
      multicall,
      w.env,
      w.io,
      probeOf(() => false),
    ),
  ).toBe(true);
});

test("a native `claude` on `PATH` passes the check with no helper on disk, and the npm build does not", async () => {
  const w = await world();
  await writeProgram(w.env.PATH, "claude", "");
  const native = { ...probeOf(() => false), isElf: async () => true };
  expect(await linuxReady(cfg, w.env, w.io, native)).toBe(true);
  expect(
    await linuxReady(
      cfg,
      w.env,
      w.io,
      probeOf(() => false),
    ),
  ).toBe(false);
});

test("the probe reads the ELF magic number of a file", async () => {
  const dir = tmpDir("dc-elf");
  const elf = path.join(dir, "elf");
  const text = path.join(dir, "text");
  await Bun.write(elf, new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 2, 1]));
  await Bun.write(text, "#!/usr/bin/env node\n");
  const probe = thisProbe();
  expect(await probe.isElf(elf)).toBe(true);
  expect(await probe.isElf(text)).toBe(false);
  expect(await probe.isElf(path.join(dir, "missing"))).toBe(false);
});
