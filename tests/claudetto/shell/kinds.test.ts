// The kinds of command in `plugins/claudetto/modules/shell/domain/shellkinds.ts` and the wrappers of `wrappers.ts`.
// Each list entry has a test that fails when the entry is removed. No command runs.

import { expect, test } from "bun:test";
import {
  bodyKind,
  runsCode,
} from "../../../plugins/claudetto/modules/shell/domain/shellkinds.ts";
import { stripWrappers } from "../../../plugins/claudetto/modules/shell/domain/wrappers.ts";

const DATA_COMMANDS =
  "cat tee echo printf git gh grep egrep fgrep rg ag jq yq head tail wc sort uniq cut tr diff cmp base64 pbcopy less column ls mkdir cd export test [ true false :".split(
    " ",
  );

const FEED_COMMANDS = "done read mapfile readarray xargs parallel".split(" ");

test.each(DATA_COMMANDS)(
  "`runsCode` is false for the data command `%s`",
  (name) => {
    // Arrange
    const argv = [name, "arg"];

    // Act
    const runs = runsCode(argv);
    const kind = bodyKind(argv);

    // Assert
    expect(runs).toBe(false);
    expect(kind).toBe("data");
  },
);

test.each(FEED_COMMANDS)(
  "`bodyKind` is `feed` for the command `%s`",
  (name) => {
    // Arrange
    const argv = [name];

    // Act
    const kind = bodyKind(argv);
    const runs = runsCode(argv);

    // Assert
    expect(kind).toBe("feed");
    expect(runs).toBe(false);
  },
);

test.each([
  ["doas", ["doas", "-u", "root", "git", "reset"]],
  ["ionice", ["ionice", "-c", "3", "-n", "4", "git", "reset"]],
  ["chrt", ["chrt", "-T", "1000", "10", "git", "reset"]],
  ["setsid", ["setsid", "git", "reset"]],
  ["builtin", ["builtin", "git", "reset"]],
])("`stripWrappers` removes the wrapper `%s`", (_name, argv) => {
  // Arrange
  const expected = ["git", "reset"];

  // Act
  const rest = stripWrappers(argv);

  // Assert
  expect(rest).toStrictEqual(expected);
});
