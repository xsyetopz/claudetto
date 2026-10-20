// The `permissions.ask` rules for a recursive `rm` (design D43).
// A rule matches the whole subcommand, and `*` stands for any text, also a space.
// So a rule such as `rm -*R*` would match `rm -f $TMPDIR/m.mjs`, because of the `R` in the path.
// These rules put the flag right after `rm ` or after a space, and end it with `*`.
// A flag cluster that starts with other letters than `r`, such as `-vfr`, is in the list of the leading letters.
// Accepted: a file name that starts with `-r`, such as `rm a -report`, also asks.

// The leads are generated: each ordered run of up to 3 distinct letters of `fiv`,
// and each of `dIPx` alone or with one letter of `fiv` before or after it.
const COMMON = ["f", "i", "v"];
const OTHER = ["d", "I", "P", "x"];
const runsOf = (letters: string[], length: number): string[] =>
  length === 0
    ? [""]
    : letters.flatMap((a) =>
        runsOf(
          letters.filter((b) => b !== a),
          length - 1,
        ).map((rest) => a + rest),
      );
const LEAD = [
  ...[0, 1, 2, 3].flatMap((n) => runsOf(COMMON, n)),
  ...OTHER.flatMap((x) => [x, ...COMMON.flatMap((c) => [x + c, c + x])]),
];
const RECURSIVE = ["r", "R"];

export const RM_ASK = [
  ...LEAD.flatMap((lead) =>
    RECURSIVE.map((flag) => `Bash(rm -${lead}${flag}*)`),
  ),
  ...RECURSIVE.map((flag) => `Bash(rm * -${flag}*)`),
  "Bash(rm --recursive*)",
  "Bash(rm * --recursive*)",
];
