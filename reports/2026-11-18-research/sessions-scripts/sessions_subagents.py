"""Items 2 and 3: session length, compaction, subagent lifetimes and parent/subagent read overlap."""
import sys, os, json, collections, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

T = threads()
mains = [t for t in T if t['kind'] == 'main']; subs = [t for t in T if t['kind'] == 'sub']
print(f'files: main={len(mains)} sub={len(subs)} total={len(T)}; mtime range {datetime.datetime.fromtimestamp(min(t["mtime"] for t in T)).isoformat()} .. {datetime.datetime.fromtimestamp(max(t["mtime"] for t in T)).isoformat()}')

def scan(t):
    first = last = None; prev_s = None; active = 0.0; out = dict(tok=0, comps=[], clears=0, models=collections.Counter(), reads=[], turn_ms=[], users=0, ncomm=0)
    seen = {}
    for ln, d in lines(t['path']):
        s = ts(d.get('timestamp'))
        if s and d.get('type') in ('user', 'assistant', 'system', 'attachment'):
            first = s if first is None else min(first, s); last = s if last is None else max(last, s)
        ty = d.get('type')
        if s and ty in ('user', 'assistant'):
            if prev_s is not None and 0 < s - prev_s <= 300: active += s - prev_s
            prev_s = s
        if ty == 'assistant' and d.get('requestId'):
            u = d['message'].get('usage') or {}
            seen[d['requestId']] = (u, d['message'].get('model'))
            for b in d['message']['content']:
                if b['type'] == 'tool_use' and b['name'] == 'Read':
                    p = (b['input'] or {}).get('file_path')
                    if p: out['reads'].append((s, p, ln, (b['input'] or {}).get('offset'), (b['input'] or {}).get('limit')))
        elif ty == 'system' and d.get('subtype') == 'compact_boundary':
            m = d['compactMetadata']; out['comps'].append((m.get('trigger'), m.get('preTokens'), m.get('postTokens'), m.get('durationMs'), ln))
        elif ty == 'system' and d.get('subtype') == 'local_command' and (d.get('commandRun') or {}).get('command') == 'clear': out['clears'] += 1
        elif ty == 'system' and d.get('subtype') == 'turn_duration': out['turn_ms'].append(d.get('durationMs') or 0)
    for rid, (u, m) in seen.items():
        out['tok'] += sum((u.get(k) or 0) for k in ('input_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens', 'output_tokens'))
        out['models'][m] += 1
    out.update(active=active, first=first, last=last, n=len(seen))
    return out

res = {t['path']: scan(t) for t in T}

print('\n## 2. session length (main sessions; first to last timestamped line)')
rows = []
for t in mains:
    r = res[t['path']]; dur = (r['last'] - r['first']) / 60
    # active time: sum of inter-line gaps <= 300 s
    rows.append((dur, t, r))
for dur, t, r in sorted(rows, key=lambda x: -x[0]):
    print(f'  {dur:8.1f} min (active<=300s gaps {r["active"]/60:7.1f})  requests={r["n"]:5d} compactions={len(r["comps"]):3d} clears={r["clears"]}  {t["label"][len("~/.claude/projects/"):]}')
durs = [d for d, _, _ in rows]
print('  active-time >=50 min:', sum(r['active']/60 >= 50 for _, _, r in rows), ' >=60 min:', sum(r['active']/60 >= 60 for _, _, r in rows))
print('  count >=50 min:', sum(d >= 50 for d in durs), ' >=60 min:', sum(d >= 60 for d in durs), ' of', len(durs), ' pct:', pct(durs))
print('\n## 2b. compactions (main vs subagent)')
for kind, ts_ in (('main', mains), ('sub', subs)):
    c = [x for t in ts_ for x in res[t['path']]['comps']]
    print(f' {kind}: total={len(c)} by trigger={dict(collections.Counter(x[0] for x in c))} preTokens pct={pct([x[1] for x in c if x[1]])} postTokens pct={pct([x[2] for x in c if x[2]])} duration_s pct={pct([x[3]/1000 for x in c if x[3]])}')
    print('   preTokens min/max', min(x[1] for x in c), max(x[1] for x in c))
print(' /clear commands (main):', sum(res[t['path']]['clears'] for t in mains))
mturn = [ms / 1000 for t in mains for ms in res[t['path']]['turn_ms']]
print(' turn_duration (main; system lines, s): n=%d pct=%s' % (len(mturn), pct(mturn)), 'max', round(max(mturn)))
# requests per compaction in main
print(' main requests per compaction:', round(sum(res[t['path']]['n'] for t in mains) / max(1, sum(len(res[t['path']]['comps']) for t in mains)), 1))

print('\n## 3. subagents')
meta = {}
for t in subs:
    mp = t['path'][:-6] + '.meta.json'
    try: meta[t['path']] = json.load(open(mp))
    except Exception: meta[t['path']] = {}
life = []; 
for t in subs:
    r = res[t['path']]; m = meta[t['path']]
    life.append(dict(life=(r['last'] - r['first']) if r['first'] else 0, n=r['n'], tok=r['tok'], model=m.get('model') or '?', picked=m.get('pickedEffortModel'), type=m.get('agentType'), bg=m.get('requestShape'), t=t, comps=len(r['comps']), used=dict(r['models'])))
print(' count:', len(life), ' agentType:', dict(collections.Counter(x['type'] for x in life)), ' requestShape:', dict(collections.Counter(x['bg'] for x in life)))
print(' declared model:', dict(collections.Counter(x['model'] for x in life)), ' actual models:', dict(collections.Counter(m for x in life for m in x['used'])))
L = [x['life'] for x in life]
print(' lifetime s p10/p50/p90:', pct(L), 'max', round(max(L)), ' >300 s:', sum(l > 300 for l in L), '=', round(sum(l > 300 for l in L) / len(L), 3), ' >3600 s:', sum(l > 3600 for l in L))
print(' requests (turns) per subagent p10/p50/p90:', pct([x['n'] for x in life]), 'max', max(x['n'] for x in life))
print(' tokens (input+cache_read+cache_creation+output) per subagent p10/p50/p90:', pct([x['tok'] for x in life]), 'sum', sum(x['tok'] for x in life))
print(' subagents with >=1 compaction:', sum(x['comps'] > 0 for x in life), ' total subagent compactions:', sum(x['comps'] for x in life))
by = collections.defaultdict(list)
for x in life: by[x['model']].append(x)
for m, xs in by.items(): print(f'  model {m}: n={len(xs)} life pct={pct([x["life"] for x in xs])} turns pct={pct([x["n"] for x in xs])} tokens sum={sum(x["tok"] for x in xs)} >300s={sum(x["life"]>300 for x in xs)}')
print(' 8 longest:')
for x in sorted(life, key=lambda x: -x['life'])[:8]: print(f'   {x["life"]/60:.1f} min turns={x["n"]} tok={x["tok"]} comps={x["comps"]} {x["t"]["label"][len("~/.claude/projects/"):]}')

print('\n## 3b. parent re-reads of files a subagent of the same session already read')
bysess = collections.defaultdict(lambda: dict(main=None, subs=[]))
for t in T:
    k = (t['project'], t['session'])
    if t['kind'] == 'main': bysess[k]['main'] = t
    else: bysess[k]['subs'].append(t)
tot_parent = dup = 0; ex = []
for k, v in bysess.items():
    if not v['main']: continue
    subread = {}
    for st in v['subs']:
        for s, p, ln, off, lim in res[st['path']]['reads']:
            if p not in subread or s < subread[p][0]: subread[p] = (s, short(st['label'], ln))
    for s, p, ln, off, lim in res[v['main']['path']]['reads']:
        tot_parent += 1
        if p in subread and subread[p][0] < s:
            dup += 1
            if len(ex) < 6: ex.append((short(v['main']['label'], ln), subread[p][1], os.path.basename(p)))
print(f' parent Read calls (sessions with a main file)={tot_parent}; of which path already read by a subagent earlier: {dup} ({dup/max(1,tot_parent):.3f})')
for e in ex: print('   example', e)
subtot = sum(len(res[st['path']]['reads']) for st in subs)
print(' subagent Read calls total:', subtot)
