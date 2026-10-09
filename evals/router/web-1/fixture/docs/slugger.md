# slugger

This page documents slugger 1.5.
The file `../vendor/package.json` has the installed version.
See `CHANGELOG.md` for the changes of each version.

`slug(text, opts)` lowercases text and joins the words.

## Options

- `joiner`: the text between words. The default is `_`.
- `ascii`: when `true`, a letter with an accent loses the accent, as in `é` to `e`.
  It also maps `ł`, `ø`, `đ` to `l`, `o`, `d`, and `ß` to `ss`.
  (Since 1.4.)
  The default is `false`.
- `limit`: the most characters in the result, joiners included.
  The function adds whole words only, so it stops before the first word that would pass the limit.
  The default is no limit.
- `keepDots`: when `true`, a dot between two digits stays, as in `4.5`.
  (Since 1.5.)
- `amp`: the word that replaces `&`, such as `"and"`.
  (Since 1.5.)
- `strip`: a regular expression for the characters to remove.
  The default removes each character that is not `a` to `z`, `0` to `9`, or white space.

## Order

The function lowercases, then removes accents (`ascii`), then removes the `strip` characters, then splits and joins.
When `ascii` is `false`, a letter with an accent is a `strip` character, so it is removed.

## The `strip` regular expression

The function passes `strip` to `String.prototype.replace` with an empty text.
So a `strip` with no `g` flag removes the first match only.
A custom `strip` replaces the default one, so it must also remove the characters that the default removes.
`slug` does not change `&`, so it needs an own step before the call when `&` is a word.
