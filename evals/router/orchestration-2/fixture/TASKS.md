# Tasks

1. In `src/last.mjs`: `last(xs, n)` returns the final item of `xs`, or `undefined` when `xs` is empty.
   When `n` is given, it returns an array of the final `n` items, and `[]` when `n` is 0.
2. In `src/cap.mjs`: `capitalizeAll(s)` upper-cases the first letter of each word and lower-cases the other letters.
   Words are split by single spaces, and the spaces stay as they are.
3. In `src/zip.mjs`: `zip(a, b)` pairs the items by index, up to the length of the shorter array.
4. In `src/count.mjs`: `countBy(xs)` returns a `Map` from each item to the number of times it occurs.
   The keys are in the order of first sight.
5. In `src/flatten.mjs`: `flatten(xs, depth = 1)` flattens nested arrays by `depth` levels.
   `Infinity` flattens all levels.
   It does not change `xs`.
6. In `src/palin.mjs`: `isPalindrome(s)` is true when `s` reads the same in both directions.
   It ignores case and every character that is not a letter or a digit.
   An empty text is a palindrome.
7. In `src/pairs.mjs`: `fromPairs(pairs)` makes an object from `[key, value]` pairs.
   A later pair wins over an earlier one with the same key.
   It throws a `TypeError` for an item that is not an array of 2.
8. In `src/roman.mjs`: `roman(n)` returns the Roman numeral of the whole number `n`.
   It throws a `RangeError` when `n` is not a whole number from 1 to 3999.
9. In `src/group.mjs`: `groupBy(xs, keyFn)` returns a `Map` from each key to the array of its items.
   `keyFn` gets the item and then its index.
   The keys are in the order of first sight, and the items of a key are in the order of `xs`.
10. In `src/duration.mjs`: `formatDuration(ms)` returns text such as `1h 2m 3s` for 3723000.
   A part that is 0 is left out, but the result for 0 is `0s`.
   A part of less than one second is dropped, so 1999 gives `1s`.
   It throws a `RangeError` when `ms` is negative, not a whole number, or not a number.
11. In `src/bits.mjs`: `popcount(n)` returns the number of 1 bits of the whole number `n`.
   It works for each safe integer from 0, also above 2 to the power of 32.
   It throws a `RangeError` when `n` is negative or not a whole number.
12. In `src/ranges.mjs`: `mergeRanges(rs)` merges ranges `[start, end]` that overlap or touch.
   Ranges touch when the end of one is the start of the next.
   The result is sorted by start, and `rs` can be in any order.
   It does not change `rs` or the ranges in it.
