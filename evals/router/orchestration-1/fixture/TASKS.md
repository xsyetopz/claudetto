# Tasks

1. In `src/pad.mjs`: `padLeft(s, n, ch = " ")` pads `s` on the left with `ch` to length `n`.
   It keeps `s` when `s` is `n` characters or more.
   It throws a `RangeError` when `ch` is not one character.
2. In `src/clamp.mjs`: `clamp(x, lo, hi)` limits `x` to the range from `lo` to `hi`.
   It throws a `RangeError` when `lo` is more than `hi`.
   It throws a `TypeError` when `x` is `NaN`.
3. In `src/uniq.mjs`: `uniq(xs, keyFn = (x) => x)` removes repeats and keeps the first of each.
   Two items are a repeat when their keys are the same value, and `NaN` is the same as `NaN`.
4. In `src/chunk.mjs`: `chunk(xs, n)` splits `xs` into arrays of `n` items.
   The last array may be shorter.
   It throws a `RangeError` when `n` is not a whole number of 1 or more.
5. In `src/median.mjs`: `median(xs)` returns the middle number of `xs`.
   For an even count it returns the mean of the two middle numbers.
   It does not change `xs`, and it returns `undefined` for an empty array.
6. In `src/camel.mjs`: `camelCase(s)` turns `foo-bar_baz qux` into `fooBarBazQux`.
   A run of `-`, `_`, or spaces is one break.
   A break at the start or end is ignored.
   The first letter is lower case, and the other letters of a word keep their case.
7. In `src/semver.mjs`: `compareVersions(a, b)` compares two versions such as `1.10.0` and `1.9.2`.
   It returns -1, 0, or 1.
   The parts are compared as numbers, so `1.10` is more than `1.9`.
   A missing part is 0, so `1.2` is the same as `1.2.0`.
   A version with a pre-release (`1.0.0-rc.1`) is less than the same version with none.
   Two pre-release texts are compared as text with `<`.
   It throws a `TypeError` when a part before the pre-release is not a whole number.
8. In `src/query.mjs`: `parseQuery(s)` parses a query text such as `?a=1&b=2&a=3` into an object.
   A leading `?` is ignored.
   A key that occurs once has a text value, and a key that occurs more than once has an array of the values in order.
   Keys and values are decoded with `decodeURIComponent`, and `+` is a space.
   A key with no `=` has the value `""`.
   An empty text gives `{}`.
9. In `src/wrap.mjs`: `wrap(text, width)` breaks `text` into lines of at most `width` characters at spaces and joins them with `\n`.
   A run of spaces is one space.
   A word that is longer than `width` is on its own line and is not split.
   An empty text gives `""`.
10. In `src/dedent.mjs`: `dedent(s)` removes the leading spaces that all non-blank lines share.
   A line with only spaces becomes an empty line.
   The other lines keep their own extra spaces.
   A final newline stays.
