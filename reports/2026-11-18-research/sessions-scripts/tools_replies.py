"""Items 5-8: hooks, large tool results, reply behaviour, interruptions. Usage: python3 -I tools_replies.py"""
import sys, os, re, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

UNIT = {'B': 1, 'KB': 1024, 'MB': 1024 ** 2, 'GB': 1024 ** 3}
PERSIST = re.compile(r'Output too large \(([\d.]+)\s*([KMG]?B)\)')
OPENERS = {
    "you're right / you are right": re.compile(r"^\W*(you'?re|you are) (absolutely |completely |totally )?(right|correct)", re.I),
    'great/good question': re.compile(r'^\W*(great|good|excellent|fair|interesting) (question|point)', re.I),
    'good catch / nice catch': re.compile(r'^\W*(good|great|nice|excellent) (catch|call|find|spot)', re.I),
    'absolutely / certainly / of course': re.compile(r'^\W*(absolutely|certainly|of course|definitely|sure thing)\b', re.I),
    'apology opener': re.compile(r"^\W*(sorry|i apologi[sz]e|apologies|my (mistake|bad|apologies)|i'?m sorry)", re.I),
    'understand your frustration': re.compile(r"i understand (your|the) (frustration|concern)", re.I),
}
APOLOGY_ANY = re.compile(r"\b(i apologi[sz]e|apologies|sorry|my mistake|my bad)\b", re.I)
CORRECT = re.compile(r"^\W*(no[,. !]|no$|nope|wrong|incorrect|i said|i told you|don'?t|do not|stop\b|that'?s (not|wrong)|that is not|not what i|why did you|you (didn'?t|forgot|missed|ignored)|actually,? (no|that))", re.I)

def tokest(n): return n / 4

def main():
    T = threads()
    toolsize = collections.defaultdict(list)       # tool -> [(est_tokens, where, persisted)]
    toolcalls = collections.Counter()
    per_sess = collections.defaultdict(lambda: collections.Counter())
    reply = {k: collections.Counter() for k in ('main', 'sub')}
    reply_ex = collections.defaultdict(list)
    human = collections.Counter(); human_corr = collections.Counter(); corr_ex = []
    hooks = dict(stop=0, stop_bytes=0, errors=0, hasout=0, infos=0, per_session=collections.Counter(), types=collections.Counter())
    hookish = collections.Counter(); hookish_bytes = 0; hookish_ex = []
    perm = collections.Counter(); perm_ex = {}
    attach_bytes = collections.Counter(); attach_n = collections.Counter()
    interrupts = collections.Counter(); sessions_seen = set()
    hits_large = collections.defaultdict(list)
    for t in T:
        k = t['kind']; sid = t['session'] if k == 'main' else t['session'] + ' (sub)'
        names = {}
        replies_seen = set()
        for ln, d in lines(t['path']):
            ty = d.get('type')
            if ty == 'assistant':
                rid = d.get('requestId')
                for b in d['message']['content']:
                    if b['type'] == 'tool_use':
                        names[b['id']] = b['name']; toolcalls[(k, b['name'])] += 1
                        if b['name'] == 'AskUserQuestion': per_sess[t['session']]['AskUserQuestion_' + k] += 1
                    elif b['type'] == 'text' and b.get('text', '').strip():
                        text = b['text'].strip()
                        key = (rid, d['uuid'])
                        reply[k]['text_blocks'] += 1
                        if rid not in replies_seen:
                            replies_seen.add(rid); reply[k]['replies'] += 1
                        if d['message'].get('stop_reason') == 'end_turn': reply[k]['final_replies'] += 1
                        if text.endswith('?'):
                            reply[k]['ends_question'] += 1
                            if d['message'].get('stop_reason') == 'end_turn': reply[k]['final_ends_question'] += 1
                        head = text[:160]
                        for name, rx in OPENERS.items():
                            if rx.search(head):
                                reply[k]['opener: ' + name] += 1
                                if len(reply_ex[name]) < 2: reply_ex[name].append(short(t['label'], ln))
                        if APOLOGY_ANY.search(text[:400]): reply[k]['apology anywhere in first 400 chars'] += 1
            elif ty == 'user':
                m = d['message']; c = m.get('content')
                if isinstance(c, list):
                    for b in c:
                        if b.get('type') == 'tool_result':
                            name = names.get(b.get('tool_use_id'), '?')
                            body = result_text(b); n = len(body.encode('utf-8', 'ignore'))
                            pm = PERSIST.search(body[:200]) if '<persisted-output>' in body[:60] else None
                            if pm: n = int(float(pm.group(1)) * UNIT[pm.group(2)])
                            if any(x.get('type') == 'image' for x in (b.get('content') or []) if isinstance(x, dict)): pass
                            toolsize[(k, name)].append((tokest(n), short(t['label'], ln), bool(pm)))
                            for pat in ('Large MCP response', 'untrusted data'):
                                if pat in body: hits_large[pat].append((short(t['label'], ln), name, k))
                        elif b.get('type') == 'text' and k == 'main' and not d.get('isMeta'):
                            pass
                pd_ = d.get('permissionDecision')
                if pd_:
                    key = (pd_.get('decision'), pd_.get('source'), pd_.get('reasonType'))
                    perm[(k,) + key] += 1; perm_ex.setdefault((k,) + key, short(t['label'], ln))
                if k == 'main' and not d.get('isMeta') and not d.get('toolUseResult') and d.get('promptId'):
                    txt = c if isinstance(c, str) else ' '.join(x.get('text', '') for x in c if isinstance(x, dict) and x.get('type') == 'text') if isinstance(c, list) else ''
                    s = txt.strip()
                    if txt.startswith('[Request interrupted'): interrupts[t['session']] += 1
                    if s and not s.startswith('<') and not s.startswith('[Request interrupted') and not any(x.get('type') == 'tool_result' for x in (c if isinstance(c, list) else [])):
                        human[t['session']] += 1
                        if CORRECT.search(s[:80]):
                            human_corr[t['session']] += 1
                            if len(corr_ex) < 6: corr_ex.append((short(t['label'], ln), s[:20]))
            elif ty == 'attachment':
                a = d['attachment']; at = a.get('type')
                if at == 'queued_command' and k == 'main' and (a.get('origin') or {}).get('kind') == 'human':
                    human[t['session']] += 1
                    p = a.get('prompt'); s = (p if isinstance(p, str) else ' '.join(x.get('text', '') for x in (p or []) if isinstance(x, dict))).strip()
                    if CORRECT.search(s[:80]):
                        human_corr[t['session']] += 1
                        if len(corr_ex) < 6: corr_ex.append((short(t['label'], ln), s[:20]))
                if at in ('file', 'edited_text_file', 'compact_file_reference', 'nested_memory'):
                    attach_n[(k, at)] += 1; attach_bytes[(k, at)] += len(json.dumps(d.get('rendered') or a.get('content') or '', ensure_ascii=False))
                if 'hook' in (at or ''): hookish[(k, 'attachment:' + at)] += 1
            elif ty == 'system':
                st = d.get('subtype')
                if st == 'stop_hook_summary':
                    hooks['stop'] += 1; hooks['stop_bytes'] += len(json.dumps(d)); hooks['errors'] += len(d.get('hookErrors') or []); hooks['hasout'] += bool(d.get('hasOutput')); hooks['infos'] += len(d.get('hookInfos') or [])
                    hooks['per_session'][t['session']] += 1; hooks['types'][d.get('level')] += 1
                elif st and 'hook' in st: hookish[(k, 'system:' + st)] += 1
                elif st == 'informational' and 'hook' in json.dumps(d).lower(): hookish[(k, 'informational-with-hook-word')] += 1
    return dict(toolsize=toolsize, toolcalls=toolcalls, per_sess=per_sess, reply=reply, reply_ex=reply_ex, human=human, human_corr=human_corr, corr_ex=corr_ex,
                hooks=hooks, hookish=hookish, perm=perm, perm_ex=perm_ex, attach_n=attach_n, attach_bytes=attach_bytes, interrupts=interrupts, hits_large=hits_large)

R = main()
print('## 6. large tool results (estimated tokens = bytes/4; persisted results use the size stated in the marker)')
rows = []
for (k, name), xs in R['toolsize'].items():
    n10 = [x for x in xs if x[0] > 10000]; n25 = [x for x in xs if x[0] > 25000]
    rows.append((len(n10), len(n25), k, name, len(xs), sum(x[2] for x in xs), max(x[0] for x in xs), sorted(xs, reverse=True)[0][1]))
tot10 = sum(r[0] for r in rows); tot25 = sum(r[1] for r in rows); totn = sum(r[4] for r in rows)
print(f' total tool results={totn}; >10k tokens={tot10}; >25k tokens={tot25}')
all_=[x for xs in R['toolsize'].values() for x in xs]
print(' of >10k: persisted-to-file (model sees a ~2 KB preview)=', sum(1 for x in all_ if x[0]>10000 and x[2]), ' of >25k:', sum(1 for x in all_ if x[0]>25000 and x[2]))
for r in sorted(rows, reverse=True)[:14]:
    if r[0] or r[4] > 100: print(f'  {r[2]:4s} {r[3]:42s} results={r[4]:6d} persisted={r[5]:4d} >10k={r[0]:4d} >25k={r[1]:4d} max~{int(r[6])} tok  largest at {r[7]}')
print(' MCP tools (any):')
for r in sorted(rows, reverse=True):
    if r[3].startswith('mcp__'): print(f'  {r[2]:4s} {r[3]:60s} results={r[4]} >10k={r[0]} >25k={r[1]} max~{int(r[6])} largest {r[7]}')
print(' WebFetch/WebSearch:', [(r[2], r[3], r[4], r[0], r[1], int(r[6])) for r in rows if r[3] in ('WebFetch', 'WebSearch')])
for pat, v in R['hits_large'].items(): print(f' text "{pat}" inside tool results (non-excluded sessions): {len(v)}', v[:3])
print('\n## attachments the program adds')
for k_, n in sorted(R['attach_n'].items()): print(' ', k_, 'count', n, 'rendered chars', R['attach_bytes'][k_])

print('\n## 5. hooks (what the transcript records)')
h = R['hooks']; nh = sum(R['human'].values())
print(f' stop_hook_summary lines={h["stop"]} hookInfos={h["infos"]} hookErrors={h["errors"]} hasOutput={h["hasout"]} bytes={h["stop_bytes"]} levels={dict(h["types"])} per session={dict(h["per_session"])}')
print(' human turns (main sessions):', nh, ' stop_hook_summary per 100 human turns:', round(100 * h['stop'] / max(1, nh), 2))
print(' hook-typed attachments/system subtypes other than stop_hook_summary:', dict(R['hookish']) or 'none')

print('\n## 7. reply behaviour (assistant text; replies = distinct requestId having a text block)')
for k in ('main', 'sub'):
    r = R['reply'][k]; n = max(1, r['replies'])
    print(f' [{k}] replies={r["replies"]} final(end_turn) text blocks={r["final_replies"]}  text blocks={r["text_blocks"]}')
    for key in sorted(set(r) | {'opener: ' + n for n in OPENERS} | {'apology anywhere in first 400 chars', 'ends_question'}):
        v = r[key]
        if key.startswith('opener') or key.startswith('apology') or key.endswith('question'): print(f'    {key:55s} {v:6d}  per100 replies={100*v/n:.2f}' + (f'  per100 final={100*v/max(1,r["final_replies"]):.2f}' if key.startswith('final') else ''))
print(' opener examples:', dict(R['reply_ex']))
print(f' human turns={nh}; corrective openers={sum(R["human_corr"].values())} per 100 human turns={100*sum(R["human_corr"].values())/max(1,nh):.2f}; per 100 main replies={100*sum(R["human_corr"].values())/max(1,R["reply"]["main"]["replies"]):.2f}; examples (first 20 chars only):', R['corr_ex'])
print(' per-session human turns / corrections:', {s: (R['human'][s], R['human_corr'][s]) for s in R['human']})
print(' "[Request interrupted" user lines per session:', dict(R['interrupts']))

print('\n## 8. interruptions')
print(' AskUserQuestion calls per session:', {s: dict(c) for s, c in R['per_sess'].items() if c})
print(' AskUserQuestion total:', sum(v for (k, n), v in R['toolcalls'].items() if n == 'AskUserQuestion'))
print(' permission decisions recorded on tool results (kind, decision, source, reasonType) -> count, first line:')
for key, v in sorted(R['perm'].items(), key=lambda kv: -kv[1]): print('   ', key, v, R['perm_ex'][key])
print(' tool calls by name (main):', [(n, v) for (k, n), v in R['toolcalls'].most_common() if k == 'main'][:14])
print(' tool calls by name (sub):', [(n, v) for (k, n), v in R['toolcalls'].most_common() if k == 'sub'][:14])
