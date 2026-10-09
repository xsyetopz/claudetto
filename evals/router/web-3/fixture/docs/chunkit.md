# chunkit

This page documents chunkit 1.3.
The file `../vendor/package.json` has the installed version.
See `CHANGELOG.md` for the changes of each version.

`chunk(items, opts)` splits an array.

## Options

- `parts`: the number of parts, not the size of a part.
  It must be a whole number of 1 or more.
- `items`: an array. In 1.2 and later, any iterable, such as a `Set` or a generator. (Since 1.2.)
- `size`: the most items in a part. Use it in place of `parts`. (Since 1.3.)
- `extra`: which parts take the extra items when the count does not divide.
  The value is `"first"` (the default) or `"last"`.

## Errors

`chunk` throws a `RangeError` when `parts` is not a whole number of 1 or more.
In 1.3 and later, a `parts` above the number of items gives one part for each item.
Before 1.3, `chunk` throws a `RangeError` for it, so it never makes an empty part.

## Notes

`chunk` checks `parts` first, and then it compares `parts` with the number of items.
The parts are new arrays, so a change to a part does not change `items`.
`chunk` does not look at the items, so `[]` with `parts: 1` throws.
