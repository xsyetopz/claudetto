"""Item 1: cache hit, prefix reuse, cache breaks and their causes. Usage: python3 -I cache.py"""
import sys, os, json, collections, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

def build(t):
    reqs = collections.OrderedDict()
    apireq = {}; shapes = {}
    events = []  # (line, kind, info)
    for ln, d in lines(t['path']):
        ty = d.get('type')
        if ty == 'api-request':
            apireq[d['id']] = dict(ts=ts(d['timestamp']), shape=d.get('shapeHash'), model=d['params'].get('model'), line=ln)
        elif ty == 'api-request-shape':
            sh = d['shape']; tools = sorted(x['name'] for x in sh.get('tools', []) if isinstance(x, dict))
            shapes[d['shapeHash']] = (hashlib.md5(json.dumps(sh.get('system')).encode()).hexdigest()[:8], tuple(tools))
        elif ty == 'assistant':
            rid = d.get('requestId')
            if not rid: continue
            u = d['message'].get('usage') or {}
            r = reqs.get(rid)
            if r is None:
                r = reqs[rid] = dict(first=ln, last=ln, ts_first=ts(d['timestamp']), ts_last=ts(d['timestamp']),
                                     model=d['message'].get('model'), ref=d.get('requestRef'), usage=u,
                                     cm=d['message'].get('context_management'), cache=d.get('promptCacheRequested'))
            else:
                r['last'] = ln; r['ts_last'] = ts(d['timestamp'])
                if (u.get('output_tokens') or 0) >= (r['usage'].get('output_tokens') or 0): r['usage'] = u
        elif ty == 'system' and d.get('subtype') == 'compact_boundary':
            events.append((ln, 'compaction:' + d['compactMetadata'].get('trigger', '?'), d['compactMetadata'].get('preTokens')))
        elif ty == 'system' and d.get('subtype') == 'local_command' and (d.get('commandRun') or {}).get('command') == 'clear':
            events.append((ln, 'clear', None))
        elif ty == 'attachment':
            at = d['attachment'].get('type')
            if at in ('thinking_drop', 'deferred_tools_delta', 'mcp_instructions_delta', 'agent_listing_delta', 'output_style_instructions', 'skill_listing', 'instructions'):
                events.append((ln, at, None))
    return list(reqs.items()), apireq, shapes, events

def main():
    global groups, cause_tot, all_breaks, cm_seen
    groups = collections.defaultdict(lambda: dict(hit=[], hit2=[], reuse=[], n=0, n2=0, ge98=0, ge98_2=0, breaks=[], w5=0, w1=0, cr=0, cc=0, inp=0))
    cause_tot = collections.defaultdict(collections.Counter)
    all_breaks = []
    cm_seen = collections.Counter()
    for t in threads():
        reqs, apireq, shapes, events = build(t)
        prev = None
        for n, (rid, r) in enumerate(reqs):
            u = r['usage']; cr = u.get('cache_read_input_tokens') or 0; cc = u.get('cache_creation_input_tokens') or 0; inp = u.get('input_tokens') or 0
            cd = u.get('cache_creation') or {}
            g = groups[(t['kind'], r['model'])]
            denom = cr + cc + inp
            g['n'] += 1; g['cr'] += cr; g['cc'] += cc; g['inp'] += inp
            g['w5'] += cd.get('ephemeral_5m_input_tokens') or 0; g['w1'] += cd.get('ephemeral_1h_input_tokens') or 0
            if not denom: prev = (rid, r); continue
            hit = cr / denom
            g['hit'].append(hit); g['ge98'] += hit >= .98
            if n >= 1:
                g['hit2'].append(hit); g['n2'] += 1; g['ge98_2'] += hit >= .98
                pu = prev[1]['usage']; pd = (pu.get('cache_read_input_tokens') or 0) + (pu.get('cache_creation_input_tokens') or 0)
                if pd: g['reuse'].append(cr / pd)
                if hit < .5:
                    a = apireq.get(r['ref']); pa = apireq.get(prev[1]['ref'])
                    start = a['ts'] if a else r['ts_first']
                    gap = start - prev[1]['ts_last']
                    lo, hi = prev[1]['last'], r['first']
                    evs = [e for e in events if lo < e[0] < hi]
                    causes = []
                    for e in evs:
                        if e[1].startswith('compaction') or e[1] == 'clear': causes.append(e[1].split(':')[0] + (':' + e[1].split(':')[1] if ':' in e[1] else ''))
                    if r['model'] != prev[1]['model']: causes.append('model_switch')
                    if a and pa and a['shape'] != pa['shape']:
                        s1, s0 = shapes.get(a['shape']), shapes.get(pa['shape'])
                        if s1 and s0:
                            if s1[1] != s0[1]: causes.append('tool_list_change')
                            if s1[0] != s0[0]: causes.append('system_prompt_change')
                            if s1 == s0: causes.append('shape_hash_only')
                        else: causes.append('shape_change_unknown')
                    ttl = 3600 if (prev[1]['usage'].get('cache_creation') or {}).get('ephemeral_1h_input_tokens') else 300
                    if gap > ttl: causes.append(f'ttl_expired(>{ttl}s)')
                    elif gap > 300: causes.append('idle>300s_within_1h')
                    if any(e[1] == 'thinking_drop' for e in evs): causes.append('thinking_drop')
                    if any(e[1] in ('deferred_tools_delta', 'mcp_instructions_delta', 'agent_listing_delta', 'skill_listing', 'instructions', 'output_style_instructions') for e in evs): causes.append('context_attachment_delta')
                    if r['cm'] and (r['cm'].get('applied_edits') if isinstance(r['cm'], dict) else r['cm']): causes.append('context_edit_applied')
                    if not causes: causes.append('early_parallel_request(turn<=3,gap<2s)' if (n + 1 <= 3 and gap < 2) else 'unexplained')
                    row = dict(kind=t['kind'], model=r['model'], where=short(t['label'], r['first']), gap=round(gap, 1), hit=round(hit, 3), cr=cr, cc=cc, causes=causes, turn=n + 1, prev_read=pu.get('cache_read_input_tokens'), prev_cc=pu.get('cache_creation_input_tokens'))
                    g['breaks'].append(row); all_breaks.append(row)
                    for c in causes: cause_tot[(t['kind'])][c.split('(')[0]] += 1
            prev = (rid, r)

    def fmt(x): return json.dumps(x)
    print('## cache per request (deduplicated by requestId)')
    for (kind, model), g in sorted(groups.items()):
        print(f'\n[{kind} | {model}] requests={g["n"]} ; after-turn-1 requests={g["n2"]}')
        print(' hit all   p10/p50/p90 =', pct(g['hit']), ' share>=0.98 =', round(g['ge98'] / max(1, len(g['hit'])), 4))
        print(' hit n>=2  p10/p50/p90 =', pct(g['hit2']), ' share>=0.98 =', round(g['ge98_2'] / max(1, len(g['hit2'])), 4))
        print(' prefix reuse read_n/(read+creation)_(n-1) p10/p50/p90 =', pct(g['reuse']), 'n=', len(g['reuse']))
        print(f' tokens: input={g["inp"]} cache_read={g["cr"]} cache_creation={g["cc"]} | write 5m={g["w5"]} 1h={g["w1"]} | aggregate hit={g["cr"]/max(1,g["cr"]+g["cc"]+g["inp"]):.4f}')
        print(' breaks (n>=2, hit<0.5):', len(g['breaks']), ' creation tokens in breaks =', sum(b['cc'] for b in g['breaks']))
    print('\n## break causes (a break can carry several labels)')
    for k, c in cause_tot.items(): print(k, c.most_common())
    print('\n## break gap distribution (s) by kind')
    for kind in ('main', 'sub'):
        gaps = [b['gap'] for b in all_breaks if b['kind'] == kind]
        print(kind, len(gaps), pct(gaps, (10, 50, 90)), 'gap>300:', sum(g > 300 for g in gaps), 'gap>3600:', sum(g > 3600 for g in gaps))
    print('\n## primary-cause breakdown (first label), with creation tokens')
    pc = collections.defaultdict(lambda: [0, 0])
    for b in all_breaks: pc[(b['kind'], b['causes'][0].split('(')[0])][0] += 1; pc[(b['kind'], b['causes'][0].split('(')[0])][1] += b['cc']
    for k, v in sorted(pc.items(), key=lambda kv: -kv[1][0]): print(k, v)
    print('\n## every main-loop break')
    for b in all_breaks:
        if b['kind'] == 'main': print(fmt(b))
    print('\n## 12 largest subagent breaks by creation tokens')
    for b in sorted([b for b in all_breaks if b['kind'] == 'sub'], key=lambda b: -b['cc'])[:12]: print(fmt(b))
    out = os.environ.get('BREAKS_OUT')
    if out:
        with open(out, 'w') as f:
            for b in all_breaks: f.write(json.dumps(b) + '\n')


if __name__ == '__main__':
    main()
