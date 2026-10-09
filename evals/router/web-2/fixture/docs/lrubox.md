# lrubox

This page documents lrubox 1.2.
The file `../vendor/package.json` has the installed version.

`new LruBox({ max })` makes a cache.
`box.put(k, v)` stores a value.
`box.fetch(k)` returns the value, or `undefined`.
`box.has(k)` tells if a key is in the cache, also when the stored value is `undefined`. (Since 1.2.)
`box.clear()` empties the cache. (Since 1.2.)
`box.size()` returns the number of keys in the cache. (Since 1.2.)
`max` must be a whole number of 1 or more. (Since 1.2.)
Before 1.2, a `max` of `0` drops each key at once.
When the cache has more than `max` keys, it drops the key that `fetch` or `put` touched longest ago.

`put` and `fetch` compare keys as a `Map` does.
So `1` and `"1"` are two keys, and `NaN` is one key.
`fetch` returns `undefined` for a key that is not in the cache.
A stored `undefined` gives the same result, so `fetch` alone cannot tell the two cases apart.
