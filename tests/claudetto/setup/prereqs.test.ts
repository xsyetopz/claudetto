// The prerequisites of the sandbox for the hard stop: the platform, the missing programs, and the install command.

import { expect, test } from "bun:test";
import { sandboxToolsOf } from "../../../plugins/claudetto/slices/setup/domain/prereqs.ts";

const LINUX = { platform: "linux", release: "6.8.0-45-generic" };
const WSL2 = {
  platform: "linux",
  release: "5.15.153.1-microsoft-standard-WSL2",
};
const WSL1 = { platform: "linux", release: "4.4.0-19041-Microsoft" };

/** A `has` test for the programs `names`. */
const on =
  (...names: string[]) =>
  (program: string) =>
    names.includes(program);

test("macOS needs no program, because Seatbelt is a part of macOS", () => {
  const host = { platform: "darwin", release: "25.0.0" };
  expect(sandboxToolsOf(host, on())).toStrictEqual({ kind: "ready" });
});

test("Linux with `bwrap` and `socat` on `PATH` is ready", () => {
  expect(sandboxToolsOf(LINUX, on("bwrap", "socat"))).toStrictEqual({
    kind: "ready",
  });
  expect(sandboxToolsOf(WSL2, on("bwrap", "socat"))).toStrictEqual({
    kind: "ready",
  });
});

test("Linux with no `bwrap` gives the `apt-get` line for the missing package only", () => {
  expect(sandboxToolsOf(LINUX, on("socat", "apt-get"))).toStrictEqual({
    kind: "missing",
    programs: ["bwrap"],
    install: "sudo apt-get install bubblewrap",
  });
});

test("Linux with neither program gives the line of each package manager", () => {
  const lines: Record<string, string> = {
    "apt-get": "sudo apt-get install bubblewrap socat",
    dnf: "sudo dnf install bubblewrap socat",
    pacman: "sudo pacman -S --needed bubblewrap socat",
    zypper: "sudo zypper install bubblewrap socat",
    apk: "sudo apk add bubblewrap socat",
    brew: "brew install bubblewrap socat",
  };
  for (const [manager, line] of Object.entries(lines)) {
    const tools = sandboxToolsOf(WSL2, on(manager));
    expect(tools).toStrictEqual({
      kind: "missing",
      programs: ["bwrap", "socat"],
      install: line,
    });
  }
});

test("a system package manager comes before `brew`", () => {
  const tools = sandboxToolsOf(LINUX, on("brew", "dnf", "bwrap"));
  expect(tools).toStrictEqual({
    kind: "missing",
    programs: ["socat"],
    install: "sudo dnf install socat",
  });
});

test("Linux with no known package manager gives no install command", () => {
  expect(sandboxToolsOf(LINUX, on("bwrap"))).toStrictEqual({
    kind: "missing",
    programs: ["socat"],
    install: undefined,
  });
});

test("WSL1, and another platform are not supported", () => {
  const all = on("bwrap", "socat", "apt-get");
  expect(sandboxToolsOf(WSL1, all)).toStrictEqual({
    kind: "unsupported",
    why: "wsl1",
  });
  expect(
    sandboxToolsOf({ platform: "freebsd", release: "14.1" }, all),
  ).toStrictEqual({ kind: "unsupported", why: "other" });
});
