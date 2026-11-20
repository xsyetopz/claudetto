"""Item 4: redundant Read calls (same path read again with no Edit/Write/Bash-modification in between)."""
import sys, os, json, re, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

MUT_GLOBAL = re.compile(r'\bgit\s+(checkout|reset|stash|pull|merge|rebase|apply|restore|cherry-pick|am|revert|clean|switch)\b|\bsed\s+-i|\b(fmt|format|prettier|biome|ruff\s+format|black|eslint\s+--fix|lint\s+--fix)\b|\bnpm\s+(i|install)\b|\bsplit|\bpatch\b|\bmake\b|\bjust\b')
MUT_PATH = re.compile(r'(>|>>|\btee\b|\bmv\b|\bcp\b|\brm\b|\bsed\s+-i|\bperl\s+-[a-z]*i|\bpython3?\b|\bnode\b|\btouch\b|\btruncate\b|\bgit\b|\bpatch\b|\bdd\b|\bcat\s+<<)')
EDIT_TOOLS = {'Edit', 'Write', 'MultiEdit', 'NotebookEdit'}

def covered(iv, a, b):
    """Is [a,b) inside the union of intervals iv?"""
    cur = a
    for s, e in sorted(iv):
        if s <= cur < e: cur = e
        if cur >= b: return True
    return cur >= b

def run(strict_global):
    tot = 0; red = 0; pats = collections.Counter(); ex = collections.defaultdict(list); bytes_red = 0; bytes_all = 0; per_kind = collections.Counter(); red_kind = collections.Counter()
    expanding = 0; skipped = collections.Counter()
    for t in threads():
        state = {}   # path -> list of intervals (valid reads), plus last read line
        pending = {}  # tool_use_id -> (path, rec)
        comp_at = []
        for ln, d in lines(t['path']):
            ty = d.get('type')
            if ty == 'system' and d.get('subtype') == 'compact_boundary':
                comp_at.append(ln)
                for p in state: state[p]['compact_since'] = True
            elif ty == 'assistant':
                for b in d['message']['content']:
                    if b['type'] != 'tool_use': continue
                    n, inp = b['name'], b['input'] or {}
                    if n == 'Read' and inp.get('file_path'):
                        p = inp['file_path']; off = inp.get('offset'); lim = inp.get('limit')
                        a = (off or 1) - 1 if off else 0
                        e = a + lim if lim else float('inf')
                        if p.endswith('.output') or '/tasks/' in p: skipped['task-output (growing log, excluded)'] += 1; continue
                        tot += 1; per_kind[t['kind']] += 1
                        st = state.get(p)
                        rec = dict(redundant=False)
                        if st and st['iv']:
                            if covered(st['iv'], a, e):
                                red += 1; red_kind[t['kind']] += 1; rec['redundant'] = True
                                full_prev = any(s == 0 and en == float('inf') for s, en in st['iv'])
                                same = (a, e) in st['ranges']
                                pat = ('IMAGE ' if p.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')) else 'TEXT ') + ('after-compaction ' if st.get('compact_since') else 'no-compaction ') + ('same-range' if same else ('range-within-earlier-full-read' if full_prev else 'range-within-earlier-partials'))
                                pats[pat] += 1
                                if len(ex[pat]) < 3: ex[pat].append((short(t['label'], ln), os.path.basename(p), st['line']))
                            elif a == 0 and e == float('inf'):
                                expanding += 1; pats['full-file read after earlier partial read(s) (not counted redundant)'] += 1
                                if len(ex['full-after-partial']) < 3: ex['full-after-partial'].append((short(t['label'], ln), os.path.basename(p), st['line']))
                        if not st: st = state[p] = dict(iv=[], ranges=set(), line=ln, base=os.path.basename(p))
                        st['iv'].append((a, e)); st['ranges'].add((a, e)); st['line'] = ln; st['compact_since'] = False
                        pending[b['id']] = rec
                    elif n in EDIT_TOOLS:
                        p = inp.get('file_path') or inp.get('notebook_path')
                        if p in state: state[p]['iv'] = []; state[p]['ranges'] = set()
                    elif n == 'Bash':
                        cmd = inp.get('command', '')
                        for p, st in state.items():
                            if st['base'] in cmd and MUT_PATH.search(cmd): st['iv'] = []; st['ranges'] = set()
                        if strict_global and MUT_GLOBAL.search(cmd):
                            for st in state.values(): st['iv'] = []; st['ranges'] = set()
            elif ty == 'user' and isinstance(d['message'].get('content'), list):
                for b in d['message']['content']:
                    if b.get('type') == 'tool_result' and b.get('tool_use_id') in pending:
                        rec = pending.pop(b['tool_use_id']); n = len(result_text(b)); bytes_all += n
                        if rec['redundant']: bytes_red += n
    return dict(tot=tot, red=red, pats=pats, ex=ex, bytes_red=bytes_red, bytes_all=bytes_all, per_kind=per_kind, red_kind=red_kind, expanding=expanding, skipped=skipped)

for name, sg in (('A: invalidate only by Edit/Write and by Bash that names the file with a mutating verb', False), ('B: A plus any Bash that looks like a global mutator (git checkout/reset/stash/pull/merge..., formatters, sed -i, make/just)', True)):
    r = run(sg)
    print(f'## variant {name}')
    print(f' Read calls={r["tot"]} (main {r["per_kind"]["main"]}, sub {r["per_kind"]["sub"]}); redundant={r["red"]} share={r["red"]/r["tot"]:.3f} (main {r["red_kind"]["main"]}, sub {r["red_kind"]["sub"]})')
    print(f' result chars (bytes/4 ~ tokens): all reads={r["bytes_all"]} redundant={r["bytes_red"]} => ~{r["bytes_red"]//4} tokens redundant of ~{r["bytes_all"]//4}; share by bytes {r["bytes_red"]/max(1,r["bytes_all"]):.3f}')
    print(' skipped:', dict(r['skipped']))
    print(' full read after earlier partial read (expanding):', r['expanding'])
    for k, v in r['pats'].most_common(): print(f'   {v:5d}  {k}')
    for k, v in r['ex'].items():
        for e in v[:2]: print('     example', k, e)
