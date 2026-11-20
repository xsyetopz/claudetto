"""Seeded logic-bug cases. A trailing `# @BUG` marks the gold line; it is
stripped before the code reaches the model. Cases with no marker are clean."""

CASES = {
"L1": '''def find(items, target):
    lo, hi = 0, len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid  # @BUG
    return -1
''',
"L2": '''def window_sums(values, k):
    """Sum of every contiguous window of length k."""
    if k <= 0 or k > len(values):
        return []
    out = []
    for i in range(len(values) - k):  # @BUG
        out.append(sum(values[i:i + k]))
    return out
''',
"L3": '''def merge(intervals):
    """Merge overlapping [start, end] intervals."""
    out = []
    for start, end in sorted(intervals):
        if out and start <= out[-1][0]:  # @BUG
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return out
''',
"L4": '''import time

class Bucket:
    def __init__(self, rate, capacity):
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last = time.monotonic()

    def take(self):
        now = time.monotonic()
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)  # @BUG
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False
''',
"L5": '''from collections import OrderedDict

class LRU:
    def __init__(self, size):
        self.size = size
        self.data = OrderedDict()

    def get(self, key):
        if key not in self.data:
            return None
        return self.data[key]  # @BUG

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.size:
            self.data.popitem(last=False)
''',
"L6": '''def checkout_total(prices, discounts):
    """Apply each percentage discount to the original subtotal, then add them up."""
    subtotal = sum(prices)
    total = subtotal
    for pct in discounts:
        total -= total * pct / 100  # @BUG
    return round(max(total, 0), 2)
''',
"L7": '''def overlaps(a_start, a_end, b_start, b_end):
    """True when half-open ranges [a_start, a_end) and [b_start, b_end) share a point."""
    return a_start < b_end or b_start < a_end  # @BUG
''',
"L8": '''def retry(call, attempts=3):
    """Call up to `attempts` times; re-raise the last error."""
    last = None
    for n in range(attempts):
        try:
            return call()
        except Exception as err:
            last = err
    if last is None:  # @BUG
        raise last
''',
"C1": '''def chunks(items, size):
    """Split items into lists of at most size elements."""
    if size <= 0:
        raise ValueError("size must be positive")
    return [items[i:i + size] for i in range(0, len(items), size)]
''',
"C2": '''def median(values):
    if not values:
        raise ValueError("empty")
    s = sorted(values)
    mid = len(s) // 2
    if len(s) % 2:
        return s[mid]
    return (s[mid - 1] + s[mid]) / 2
''',
}


def prepared():
    """Return {id: (code, gold_line_or_None)} with markers removed."""
    out = {}
    for cid, src in CASES.items():
        gold = None
        lines = []
        for n, line in enumerate(src.splitlines(), 1):
            if line.endswith("# @BUG"):
                gold = n
                line = line[: -len("# @BUG")].rstrip()
            lines.append(line)
        out[cid] = ("\n".join(lines) + "\n", gold)
    return out
