// Publishes `wiki/` to the GitHub wiki (`just wiki`).
// The wiki repository exists only after its first page is made in the web UI.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { $ } from "bun";
import { must, output, REPO, recipe } from "./recipes.ts";

const WIKI = "https://github.com/xsyetopz/dotclaude.wiki.git";

await recipe(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dotclaude-wiki-"));
  try {
    await must($`git clone --quiet ${WIKI} ${tmp}`);
    // As `rsync --delete --exclude .git`: remove each entry but `.git`, then copy `wiki/`.
    for (const name of fs.readdirSync(tmp))
      if (name !== ".git")
        fs.rmSync(path.join(tmp, name), { recursive: true, force: true });
    fs.cpSync(path.join(REPO, "wiki"), tmp, { recursive: true });
    await must($`git -C ${tmp} add -A`);
    const diff = await $`git -C ${tmp} diff --cached --quiet`.nothrow();
    if (diff.exitCode === 0) {
      console.log("The wiki is up to date.");
      return;
    }
    const head = (await output($`git rev-parse --short HEAD`)).trim();
    await must(
      $`git -C ${tmp} commit --quiet -m ${`Sync wiki from dotclaude ${head}`}`,
    );
    await must($`git -C ${tmp} push --quiet origin HEAD`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
