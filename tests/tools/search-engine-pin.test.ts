// Spec `prompt-base`, "Repository Facts": the `grep` line of the `repo` block rests on facts of 2.1.309 that no doc states (undocumented-facts rule).
// The fixture holds the source of the shell snapshot and of `kT()`, and each check fails when an update changes the fact or when `MIN_CLAUDE_CODE_VERSION` moves past the fixture.

import { expect, test } from "bun:test";
import path from "node:path";
import {
  type SearchFacts,
  usesUgrep,
} from "../../plugins/claudetto/modules/session/prompt/domain/facts.ts";
import { MIN_CLAUDE_CODE_VERSION } from "../../tools/limits.ts";
import { REPO } from "../support/repo.ts";

const FIXTURE = path.join(
  REPO,
  "tests/claudetto/session/prompt/fixtures/search-engine-2.1.309.json",
);

/** The source excerpts of the fixture. */
interface Excerpts {
  version: string;
  kT: string;
  searchToolsOptIn: string;
  snapshot: string;
  vcsFolders: string;
  execPath: string;
}

const read = async (): Promise<Excerpts> => Bun.file(FIXTURE).json();

const NATIVE: SearchFacts = {
  execPath: "/Users/u/.local/share/claude/versions/2.1.309",
  toolNames: ["Bash", "Read"],
  entrypoint: "cli",
};

test("Search Engine Pin: the fixture is for `MIN_CLAUDE_CODE_VERSION`", async () => {
  expect((await read()).version).toBe(MIN_CLAUDE_CODE_VERSION);
});

test("Search Engine Pin: the snapshot shadows `grep` with `ugrep` and `find` with `bfs`, with the flags and the VCS folders", async () => {
  const { snapshot, vcsFolders } = await read();
  expect(snapshot).toContain(
    'eot("grep","ugrep",["-G","--ignore-files","--hidden","-I"',
  );
  expect(snapshot).toContain("--exclude-dir=");
  expect(snapshot).toContain('eot("find","bfs"');
  expect(vcsFolders).toContain('[".git",".svn",".hg",".bzr",".jj",".sl"]');
});

test("Search Engine Pin: `kT()` needs a native build, `Grep` and `Glob` off, and an entry point other than `local-agent`", async () => {
  const { kT, searchToolsOptIn } = await read();
  expect(kT).toContain('if(!Ne("true"))return!1');
  expect(kT).toContain("if(Ies())return!1");
  expect(kT).toContain('CLAUDE_CODE_ENTRYPOINT!=="local-agent"');
  expect(searchToolsOptIn).toContain("searchToolsOptIn()");
  expect(usesUgrep(NATIVE)).toBe(true);
  expect(usesUgrep({ ...NATIVE, toolNames: ["Bash", "Grep"] })).toBe(false);
  expect(usesUgrep({ ...NATIVE, toolNames: ["Glob"] })).toBe(false);
  expect(usesUgrep({ ...NATIVE, entrypoint: "local-agent" })).toBe(false);
  expect(usesUgrep({ ...NATIVE, execPath: "/usr/local/bin/node" })).toBe(false);
  expect(usesUgrep({ ...NATIVE, execPath: "" })).toBe(false);
});

test("Search Engine Pin: the shell provider sets `CLAUDE_CODE_EXECPATH` to `process.execPath`, which the hook reads to see the native build", async () => {
  expect((await read()).execPath).toContain("process.execPath");
  expect((await read()).execPath).toContain("CLAUDE_CODE_EXECPATH");
});
