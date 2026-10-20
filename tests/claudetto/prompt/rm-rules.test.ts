// The `rm` ask rules match the recursive flags only, and not an `r` or `R` in a path (design D43).
// A command is a string that no test runs.

import { expect, test } from "bun:test";
import { askMatcher } from "./ask-rules.ts";

const matched = askMatcher("Bash(rm ");

test("an `rm` with a recursive flag asks", () => {
  const forms = [
    "rm -r dir",
    "rm -R dir",
    "rm -rf build",
    "rm -fr build",
    "rm -Rf build",
    "rm -fR build",
    "rm -rfv build",
    "rm -vfr build",
    "rm -f -r build",
    "rm -f build -r",
    "rm -dr dir",
    "rm -dfr dir",
    "rm -Pfr dir",
    "rm -Ir dir",
    "rm -xr dir",
    "rm -fvir dir",
    "rm -ivfR dir",
    "rm -rdv dir",
    "rm --recursive dir",
    "rm -f --recursive dir",
    "rm dir --recursive",
  ];
  expect(forms.filter((command) => !matched(command))).toStrictEqual([]);
});

test("an `rm` with no recursive flag passes, also with an `r` or `R` in a path", () => {
  const forms = [
    "rm -f $TMPDIR/m.mjs",
    "rm -f /tmp/Report.txt",
    "rm -f /tmp/report.txt",
    "rm report.txt",
    "rm -i draft.md",
    "rm -f a.txt b.txt",
  ];
  expect(forms.filter(matched)).toStrictEqual([]);
});
