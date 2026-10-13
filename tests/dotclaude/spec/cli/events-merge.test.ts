// `events.jsonl`: two appends on two branches merge with no conflict, through `merge=union` of `.gitattributes`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { run } from "./read-fixture.ts";
import {
  CHANGES,
  eventsOf,
  file,
  git,
  phase,
  pkgFile,
  plannedChange,
  write,
} from "./run-phase.ts";

test("two packages started on two branches merge with no conflict and keep both events", async () => {
  const root = await plannedChange();
  await write(
    root,
    pkgFile("c1", "P2"),
    (await file(root, pkgFile("c1"))).replace(/^id: P1$/m, "id: P2"),
  );
  fs.copyFileSync(
    path.join(import.meta.dir, "../../../../.gitattributes"),
    path.join(root, ".gitattributes"),
  );
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "plan");

  git(root, "checkout", "-q", "-b", "side");
  expect((await phase(root, "implement", "P2")).code).toBe(0);
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "side");

  git(root, "checkout", "-q", "main");
  expect((await phase(root, "implement", "P1")).code).toBe(0);
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "main");

  git(root, "merge", "-q", "--no-edit", "side");
  const doing = (await eventsOf(root, "c1"))
    .filter((e) => e["state"] === "doing")
    .map((e) => e["package"]);
  expect(doing.sort()).toEqual(["P1", "P2"]);
  expect((await file(root, `${CHANGES}/c1/events.jsonl`)).split("\n")[0]).toBe(
    '{"schema":2}',
  );
  const status = await run(root, "status", "c1", "--json");
  expect(JSON.parse(status.out.join("")).states).toMatchObject({ doing: 2 });
});
