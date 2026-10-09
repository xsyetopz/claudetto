// Tests of the variable resolution in the `rm` rule of the guard (design D28).
// Each command is a string for the rule. Nothing runs it.

import { expect, test } from "bun:test";
import { rmOutside } from "../../plugins/dotclaude/features/guard/rules.mjs";

const ctx = {
  cwd: "/w/app",
  root: "/w/app",
  home: "/h",
  safe: ["/tmp"],
  tmp: "/var/T",
};

test("a variable from `mktemp` or from `TMPDIR` resolves to the temp root", () => {
  for (const command of [
    'P=$(mktemp -d); rm -rf "$P"',
    "SBX=$(mktemp -d) && cd x && rm -rf $SBX/sub",
    "P=`mktemp -d`\nrm -rf $P",
    "export R=$(mktemp -d -t foo.XXXX); rm -rf $R",
    "M=$(mktemp -d)/m; rm -rf $M",
    "DOTCLAUDE_SANDBOX=$TMPDIR/sbx; rm -rf $DOTCLAUDE_SANDBOX",
    "D=${TMPDIR}/a; E=$D/b; rm -rf ${E}",
    "rm -rf $TMPDIR/x",
    "rm -rf ${TMPDIR}/x/*",
  ])
    expect(rmOutside(command, ctx)).toEqual([]);
});

test("an unsafe value or a reassigned `TMPDIR` still asks", () => {
  for (const [command, found] of [
    ["TMPDIR=/; rm -rf $TMPDIR/x", ["$TMPDIR/x"]],
    ["export TMPDIR=/etc && rm -rf $TMPDIR/x", ["$TMPDIR/x"]],
    ["TMPDIR=$(mktemp -d); rm -rf $TMPDIR/x", ["$TMPDIR/x"]],
    ["rm -rf $TMPDIR/../..", ["$TMPDIR/../.."]],
    ["P=$TMPDIR/../x; rm -rf $P", ["$P"]],
    ["P=$(mktemp -d); rm -rf $P/../..", ["$P/../.."]],
    ["rm -rf $VAR", ["$VAR"]],
    ["P=$(mktemp -d); rm -rf $Q", ["$Q"]],
    ["P=$(mktemp -d); P=$(cat f); rm -rf $P", ["$P"]],
    ["P=$(mktemp -d /etc/XXXX); rm -rf $P", ["$P"]],
    ["P=$(mktemp); rm -rf $P", ["$P"]],
    ["P=$(mktemp -d); rm -rf $P$X", ["$P$X"]],
    ["P=$(mktemp -d); rm -rf ~", ["~"]],
    ["P=$(mktemp -d); rm -rf /", ["/"]],
    ["rm -rf $TMPDIR", ["$TMPDIR"]],
  ])
    expect(rmOutside(command, ctx)).toEqual(found);
});

test("without a `TMPDIR` value the variable stays unresolved", () => {
  const bare = { ...ctx, tmp: undefined };
  expect(rmOutside("rm -rf $TMPDIR/x", bare)).toEqual(["$TMPDIR/x"]);
  expect(rmOutside("P=$(mktemp -d); rm -rf $P", bare)).toEqual([]);
});

test("a later segment that sets a resolved variable in another form makes it unresolved", () => {
  for (const set of [
    'read D <<< "$HOME"',
    "D+=/../../..",
    'eval "D=$HOME"',
    'printf -v D %s "$HOME"',
    "for D in ~; do :",
    "mapfile D < f",
    "readarray -t D < f",
    "declare -n D=HOME",
    "typeset -x D=$HOME",
    "export -n D",
    "local D",
    "let D=1",
    "unset D",
    "D[0]=~",
    "source ./f",
    "while read D",
  ])
    expect(rmOutside(`D=$(mktemp -d); ${set}; rm -rf "$D"`, ctx)).toEqual([
      "$D",
    ]);
  expect(
    rmOutside('D=$(mktemp -d); for D in ~; do rm -rf "$D"; done', ctx),
  ).toEqual(["$D"]);
});

test("`unset TMPDIR` makes `$TMPDIR` unresolved", () => {
  expect(rmOutside("unset TMPDIR; rm -rf $TMPDIR/x", ctx)).toEqual([
    "$TMPDIR/x",
  ]);
});

test("a plain `export NAME=value` and an unrelated setter keep the variable", () => {
  for (const command of [
    'D=$(mktemp -d); read X; rm -rf "$D"',
    'D=$(mktemp -d); export E=1; rm -rf "$D"',
    'export D=$(mktemp -d); local_x=1; rm -rf "$D"',
  ])
    expect(rmOutside(command, ctx)).toEqual([]);
});

test("the `rm` after `do`, `then`, `else`, `elif`, `{`, `(`, `!`, or `time` is seen", () => {
  for (const command of [
    "for x in 1; do rm -rf ~; done",
    "if true; then rm -rf ~; fi",
    "if false; then :; else rm -rf ~; fi",
    "if false; then :; elif true; then rm -rf ~; fi",
    "(rm -rf ~)",
    "{ rm -rf ~; }",
    "! rm -rf ~",
    "time rm -rf ~",
    "while true; do rm -rf ~; done",
  ])
    expect(rmOutside(command, ctx)).toEqual(["~"]);
  expect(
    rmOutside('D=$(mktemp -d); for x in 1; do rm -rf "$D"; done', ctx),
  ).toEqual([]);
});
