// The hard stop of `claudetto-setup sandbox`: the case of a checkout, the merge, a second run, and the remove mode.

import { expect, test } from "bun:test";
import {
  bypassesOf,
  HARD_STOP,
  planStop,
  recordOf,
  removeStop,
  stopCaseOf,
} from "../../../plugins/claudetto/slices/setup/domain/hard-stop.ts";

const REPO = { host: "github.com", owner: "Upstream", name: "tool" };
const OWNERS = new Set(["me", "my-org"]);

test("a checkout with no origin gets no hard stop", () => {
  expect(stopCaseOf(undefined, OWNERS, undefined)).toBe("no-origin");
});

test("a repository of the user or of an owned organization gets no hard stop", () => {
  expect(stopCaseOf({ ...REPO, owner: "Me" }, OWNERS, "forbidden")).toBe("own");
  expect(stopCaseOf({ ...REPO, owner: "my-org" }, OWNERS, undefined)).toBe(
    "own",
  );
});

test("an external repository with the verdict `allowed` or `conditions` gets no hard stop", () => {
  expect(stopCaseOf(REPO, OWNERS, "allowed")).toBe("cleared");
  expect(stopCaseOf(REPO, OWNERS, "conditions")).toBe("cleared");
});

test("an external repository with `silent`, `forbidden`, or no verdict gets the hard stop", () => {
  for (const verdict of ["silent", "forbidden", undefined])
    expect(stopCaseOf(REPO, OWNERS, verdict)).toBe("stop");
});

test("with no login, each repository is external", () => {
  expect(stopCaseOf(REPO, new Set(), "silent")).toBe("stop");
});

test("the merge adds the hard stop and keeps the other keys of the user", () => {
  const current = {
    model: "opus",
    sandbox: {
      autoAllowBashIfSandboxed: true,
      network: { deniedDomains: ["evil.example"], allowedDomains: ["x.dev"] },
    },
  };
  const { settings } = planStop(current);
  expect(settings).toStrictEqual({
    model: "opus",
    sandbox: {
      autoAllowBashIfSandboxed: true,
      enabled: true,
      failIfUnavailable: true,
      allowUnsandboxedCommands: false,
      network: {
        deniedDomains: ["evil.example", "github.com", "*.github.com"],
        allowedDomains: ["x.dev"],
      },
    },
  });
});

test("the record names only what the merge changed, with each old value", () => {
  const current = {
    sandbox: {
      enabled: true,
      allowUnsandboxedCommands: true,
      network: { deniedDomains: ["github.com"] },
    },
  };
  expect(planStop(current).record).toStrictEqual({
    set: [
      { key: "failIfUnavailable" },
      { key: "allowUnsandboxedCommands", had: true },
    ],
    denied: ["*.github.com"],
  });
});

test("a second run changes nothing and keeps the record of the first run", () => {
  const first = planStop({ sandbox: { enabled: false } });
  const second = planStop(first.settings, first.record);
  expect(second.changes).toStrictEqual([]);
  expect(second.settings).toStrictEqual(first.settings);
  expect(second.record).toStrictEqual(first.record);
});

test("a run after the user changed a key keeps the first old value in the record", () => {
  const first = planStop({});
  const sandbox = first.settings["sandbox"] as Record<string, unknown>;
  const changed = { sandbox: { ...sandbox, enabled: false } };
  const second = planStop(changed, first.record);
  expect(second.record).toStrictEqual(first.record);
});

test("the remove mode takes out exactly what the merge changed", () => {
  const before = {
    model: "opus",
    sandbox: {
      enabled: false,
      network: { deniedDomains: ["evil.example"] },
    },
  };
  const { settings, record } = planStop(before);
  expect(removeStop(settings, record).settings).toStrictEqual(before);
});

test("the remove mode deletes the objects and lists that only the hard stop made", () => {
  const { settings, record } = planStop({ model: "opus" });
  expect(removeStop(settings, record).settings).toStrictEqual({
    model: "opus",
  });
});

test("the remove mode keeps a key that the user changed after the run", () => {
  const { settings, record } = planStop({});
  const sandbox = settings["sandbox"] as Record<string, unknown>;
  const changed = { sandbox: { ...sandbox, allowUnsandboxedCommands: true } };
  const out = removeStop(changed, record).settings;
  expect(out).toStrictEqual({ sandbox: { allowUnsandboxedCommands: true } });
});

test("the remove mode keeps a deny entry that the user had before the run", () => {
  const before = { sandbox: { network: { deniedDomains: ["github.com"] } } };
  const { settings, record } = planStop(before);
  expect(removeStop(settings, record).settings).toStrictEqual(before);
});

test("the settings of the hard stop deny `github.com` and its subdomains", () => {
  expect(HARD_STOP).toStrictEqual({
    sandbox: {
      enabled: true,
      failIfUnavailable: true,
      allowUnsandboxedCommands: false,
      network: { deniedDomains: ["github.com", "*.github.com"] },
    },
  });
});

test("the excluded commands of each settings file are named once", () => {
  const user = { sandbox: { excludedCommands: ["git push *", "docker *"] } };
  const local = { sandbox: { excludedCommands: ["git push *", 3] } };
  expect(bypassesOf([user, {}, local, undefined])).toStrictEqual([
    "git push *",
    "docker *",
  ]);
});

test("a record file with unknown keys keeps only the known keys", () => {
  expect(
    recordOf({
      set: [{ key: "enabled" }, { key: "excludedCommands" }],
      denied: ["github.com", 1],
    }),
  ).toStrictEqual({ set: [{ key: "enabled" }], denied: ["github.com"] });
  expect(recordOf([])).toBeUndefined();
  expect(recordOf(undefined)).toBeUndefined();
});
