// The diff that setup shows before it writes a file.

const CONTEXT = 2;

/** The changed lines of `before` to `after`, as `-` and `+` lines with `CONTEXT` lines around them. */
export function lineDiff(before, after) {
  const a = before.split("\n");
  const b = after.split("\n");
  // Longest common subsequence table, filled from the end.
  const lcs = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      ops.push(`  ${a[i]}`);
      i++;
      j++;
    } else if (
      i < a.length &&
      (j === b.length || lcs[i + 1][j] >= lcs[i][j + 1])
    ) {
      ops.push(`- ${a[i++]}`);
    } else {
      ops.push(`+ ${b[j++]}`);
    }
  }
  const keep = new Set();
  ops.forEach((op, k) => {
    if (op[0] === " ") return;
    for (let n = k - CONTEXT; n <= k + CONTEXT; n++) keep.add(n);
  });
  const out = [];
  let last = -1;
  for (const k of [...keep].filter((n) => n >= 0 && n < ops.length)) {
    if (last >= 0 && k > last + 1) out.push("  ...");
    out.push(ops[k]);
    last = k;
  }
  return out;
}
