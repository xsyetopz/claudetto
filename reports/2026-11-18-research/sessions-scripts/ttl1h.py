"""1h TTL refresh check on main-loop sessions with 1h cache writes. Usage: python3 -I ttl1h.py"""
import sys, os, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from cache import build

B = [(0, 60), (60, 120), (120, 1e9)]
def bucket(m):
    for i, (a, b) in enumerate(B):
        if a <= m < b: return i

def analyse(strict):
    """strict=True: segments split at idle>3600 s, compaction, /clear, model switch. strict=False: split only at idle>3600 s (compaction ignored)."""
    seg_rows = []; reqs_by_bucket = collections.defaultdict(list); breaks55 = []; qual = []
    for t in threads():
        if t['kind'] != 'main': continue
        reqs, apireq, shapes, events = build(t)
        if not any(((r['usage'].get('cache_creation') or {}).get('ephemeral_1h_input_tokens') or 0) > 0 for _, r in reqs): continue
        seg = []; prev = None; segs = []
        for rid, r in reqs:
            start = (apireq.get(r['ref']) or {}).get('ts') or r['ts_first']
            split = False; why = None
            if prev is not None:
                gap = start - prev[1]['ts_last']
                evs = [e for e in events if prev[1]['last'] < e[0] < r['first']]
                if gap > 3600: split, why = True, 'idle>3600'
                elif strict and any(e[1].startswith('compaction') for e in evs): split, why = True, 'compaction'
                elif strict and any(e[1] == 'clear' for e in evs): split, why = True, 'clear'
                elif strict and r['model'] != prev[1]['model']: split, why = True, 'model_switch'
            if split or prev is None:
                seg = []; segs.append((why, seg))
            seg.append((rid, r, start)); prev = (rid, r)
        for why, seg in segs:
            if len(seg) < 2: continue
            dur = (seg[-1][2] - seg[0][2]) / 60
            seg_rows.append((dur, t, seg, why))
            if dur > 60:
                qual.append((dur, t, seg))
    for dur, t, seg in qual:
        t0 = seg[0][2]
        for i, (rid, r, start) in enumerate(seg):
            if i == 0: continue
            u = r['usage']; cr = u.get('cache_read_input_tokens') or 0; cc = u.get('cache_creation_input_tokens') or 0; inp = u.get('input_tokens') or 0
            den = cr + cc + inp
            if not den: continue
            age = (start - t0) / 60; hit = cr / den
            reqs_by_bucket[bucket(age)].append(hit)
            if 55 <= age < 70 and hit < .5:
                gap = start - seg[i - 1][1]['ts_last']
                breaks55.append((short(t['label'], r['first']), round(age, 1), round(hit, 3), cc, round(gap, 1)))
    return seg_rows, qual, reqs_by_bucket, breaks55

for strict in (True, False):
    seg_rows, qual, rb, b55 = analyse(strict)
    print(f'## {"strict segments (split at idle>3600 s, compaction, /clear, model switch)" if strict else "relaxed segments (split only at idle>3600 s; compactions stay inside)"}')
    print(' main sessions with 1h writes: see segments; segments with >=2 requests:', len(seg_rows), ' longest segment minutes:', [round(x[0], 1) for x in sorted(seg_rows, key=lambda x: -x[0])[:6]])
    print(' qualifying segments (>60 min):', len(qual), ' in sessions:', len({q[1]['session'] for q in qual}))
    for dur, t, seg in qual: print(f'   {dur:7.1f} min requests={len(seg)} first line {short(t["label"], seg[0][1]["first"])}')
    for i, (a, b) in enumerate(B):
        h = rb[i]; print(f' age {a}-{int(b) if b < 1e8 else "inf"} min: requests={len(h)} hit p10/p50 = {pct(h, (10, 50))}  share<0.5 = {round(sum(x < .5 for x in h) / max(1, len(h)), 4)}')
    print(f' breaks (hit<0.5) at age 55-70 min with no idle gap>3600 s: {len(b55)}')
    for b in b55[:8]: print('   ', b)
