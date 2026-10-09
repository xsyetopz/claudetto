// The oracles of the router `audit-*` cases, run on written `AUDIT.md` files.
// Router run 2026-10-09: the oracles failed defensible extra findings,
// so the more thorough reference pair scored below the candidate.

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.join(import.meta.dir, "../../evals/router");

/** Whether the oracle of `name` passes on `audit` as the text of `AUDIT.md`. */
function oraclePasses(name, audit) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-oracle-"));
  try {
    fs.copyFileSync(
      path.join(ROOT, name, "oracle/audit.test.mjs"),
      path.join(dir, "audit.test.mjs"),
    );
    fs.writeFileSync(path.join(dir, "AUDIT.md"), audit);
    const run = spawnSync("node", ["--test", "audit.test.mjs"], { cwd: dir });
    return run.status === 0;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const FLAWS = {
  "audit-1": [
    "- `readUpload`: it decodes the name after the `..` check, so `%2e%2e` escapes.",
    "- `saveUpload`: the `startsWith` check has no trailing slash, so `/srv/uploads-x` passes.",
    "- `extractUpload`: the entry name is not checked, so `../` writes outside the folder (zip slip).",
    "- `contentDisposition`: a quote or a newline in the name breaks the header (header injection).",
    "- `moveUpload`: the destination `to` is not checked, so `../` moves the file outside the folder.",
    "- `tempPath`: the name comes from `Date.now`, so it is predictable in the shared `/tmp`.",
  ],
  "audit-2": [
    "- `sortUsers`: the column goes into the SQL text, so it is SQL injection.",
    "- `resetToken`: `Math.random` is not a secure random source, so the token is predictable.",
    "- `renderProfile`: the name and the bio go into the HTML with no escape, so it is XSS.",
    "- `afterLogin`: `//evil.example` starts with `/`, so it is an open redirect.",
    "- `loginUser`: the two messages tell if the user exists, so it is user enumeration.",
    "- `checkToken`: `===` is not constant time, so the compare leaks by timing.",
  ],
  "audit-3": [
    "- `evaluate`: the `m` flag lets one safe line pass the regex, and the next line runs.",
    "- `loadFormula`: the name goes into the `import` path, so `../` loads any module.",
    "- `mergeSettings`: the key `__proto__` is merged, so it is prototype pollution.",
    "- `exportReport`: the name goes into a shell command, so it is command injection.",
    "- `validateName`: the nested quantifier backtracks, so a long name is ReDoS.",
    "- `fetchSchema`: `startsWith` accepts `https://schemas.example.com.evil.net`, so it is SSRF.",
  ],
};

const EXTRA = {
  "audit-1": [
    "- `uploadSize`: `..` gives the size of `/srv`.",
    "- `copyUpload`: a link inside the folder can point outside it.",
  ],
  "audit-2": [
    "- `searchUsers`: `%` and `_` in the term are not escaped.",
    "- `setRole`: the role has no allowlist.",
  ],
  "audit-3": ["- `parseNumber`: it accepts `Infinity` and hex."],
};

const SOUND = {
  "audit-1": [
    "- `listUploads`: it lists the folder.",
    "- `deleteUpload`: it deletes a file.",
    "- `isImage`: it checks the end of the name.",
    "- `relativeName`: it checks the relative path.",
    "- `uploadUrl`: it builds a link.",
  ],
  "audit-2": [
    "- `sessionId`: it is long.",
    "- `checkPassword`: it hashes the password.",
    "- `profileUrl`: it builds a link.",
    "- `getUser`: it reads one user.",
    "- `bulkLoad`: it builds the list of marks.",
    "- `pageUsers`: it sorts the users.",
  ],
  "audit-3": [
    "- `total`: it adds the list.",
    "- `hashName`: it hashes the name.",
    "- `formatResult`: it rounds the number.",
    "- `runReport`: it runs the report.",
    "- `loadKnown`: it loads a formula.",
  ],
};

for (const name of Object.keys(FLAWS)) {
  test(`${name}: the two flaws pass`, () => {
    expect(oraclePasses(name, `${FLAWS[name].join("\n")}\n`)).toBe(true);
  });

  test(`${name}: a defensible extra finding passes`, () => {
    const audit = [...FLAWS[name], ...EXTRA[name]].join("\n");
    expect(oraclePasses(name, `${audit}\n`)).toBe(true);
  });

  test(`${name}: a heading and a second sentence on its own line pass`, () => {
    const [a, ...rest] = FLAWS[name];
    const audit = `# Security audit\n\n${a}\nThe fix is a check after the decode.\n${rest.join("\n")}\n`;
    expect(oraclePasses(name, audit)).toBe(true);
  });

  for (const sound of SOUND[name])
    test(`${name}: a sound function fails (${sound.slice(3, 12)})`, () => {
      const audit = [...FLAWS[name], sound].join("\n");
      expect(oraclePasses(name, `${audit}\n`)).toBe(false);
    });

  // A fast run finds the first flaws only, so each flaw must be in the list.
  for (const [i, flaw] of FLAWS[name].entries())
    test(`${name}: a list with no ${flaw.slice(3, 14)} fails`, () => {
      const rest = FLAWS[name].filter((_, j) => j !== i);
      expect(oraclePasses(name, `${rest.join("\n")}\n`)).toBe(false);
    });

  test(`${name}: a flaw line with no cause fails`, () => {
    const [first, ...rest] = FLAWS[name];
    const bare = first.split(":")[0].concat(": bad.");
    expect(oraclePasses(name, `${[bare, ...rest].join("\n")}\n`)).toBe(false);
  });
}
