# Tasks

1. In `src/even.mjs`: `isEven(n)` is true for even integers and false for odd integers.
   It throws a `TypeError` when `n` is not an integer, such as `2.5`, `NaN`, or `"2"`.
2. In `src/words.mjs`: `words(s)` splits text on runs of spaces.
   A space at the start or end gives no empty item.
   A tab or a newline is not a space, so it stays in the word.
   An empty text gives `[]`.
3. In `src/range.mjs`: `range(a, b)` lists the integers from `a` up to but not including `b`.
   It gives `[]` when `a` is `b` or more.
   It throws a `RangeError` when `a` or `b` is not an integer.
4. In `src/bytes.mjs`: `formatBytes(n)` writes a count of bytes with the units `B`, `KB`, `MB`, `GB`, and `TB`, with 1024 in each step.
   The unit is the largest one that is at most `n`, chosen before the rounding.
   A count below 1024 is `N B`.
   Above that, the value has one decimal, and `.0` is left out, as in `1.5 KB` and `2 KB`.
   A count above 1024 TB stays in `TB`.
   It throws a `RangeError` when `n` is negative or not a whole number.
5. In `src/transpose.mjs`: `transpose(rows)` swaps the rows and the columns of an array of arrays.
   An empty array gives `[]`.
   It throws a `RangeError` when the rows are not all the same length.
   It does not change `rows`.
6. In `src/pick.mjs`: `pick(obj, keys)` makes a new object with the listed keys of `obj`.
   It leaves out a key that `obj` does not have as an own property, also a key from the prototype.
   The keys of the result are in the order of `keys`.
7. In `src/leap.mjs`: `isLeapYear(y)` is true for a leap year of the Gregorian calendar.
   A year that divides by 4 is a leap year, except a year that divides by 100 and not by 400.
   It throws a `TypeError` when `y` is not an integer.
