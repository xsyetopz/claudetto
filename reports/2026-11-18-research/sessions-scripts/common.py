"""Shared loader for the claudetto transcript analysis. Run scripts with python3 -I from this directory's parent via sys.path."""
import glob, json, os, re, sys, datetime

ROOT = os.path.expanduser('~/.claude/projects')
EXCLUDE_SESSION = '2cf55002-c3a4-457f-b01c-e854d76d621e'
SINCE = datetime.datetime(2026, 11, 16).timestamp()


def threads(since=SINCE):
    """Yield dicts: path, kind ('main'|'sub'), project, session, agent, label (attribution prefix)."""
    out = []
    for p in sorted(glob.glob(ROOT + '/*/*.jsonl')):
        proj, name = p.split('/')[-2:]
        sess = name[:-6]
        out.append(dict(path=p, kind='main', project=proj, session=sess, agent=None,
                        label=f'~/.claude/projects/{proj}/{name}'))
    for p in sorted(glob.glob(ROOT + '/*/*/subagents/*.jsonl')):
        proj, sess, _, name = p.split('/')[-4:]
        out.append(dict(path=p, kind='sub', project=proj, session=sess, agent=name[:-6],
                        label=f'~/.claude/projects/{proj}/{sess}/subagents/{name}'))
    out = [t for t in out if t['session'] != EXCLUDE_SESSION]
    for t in out:
        t['mtime'] = os.stat(t['path']).st_mtime
    return [t for t in out if t['mtime'] >= since]


def lines(path):
    with open(path, encoding='utf-8') as f:
        for i, l in enumerate(f, 1):
            try:
                yield i, json.loads(l)
            except ValueError:
                continue


def ts(s):
    return datetime.datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp() if s else None


def pct(xs, qs=(10, 50, 90)):
    xs = sorted(xs)
    if not xs:
        return {q: None for q in qs}
    r = {}
    for q in qs:
        k = (len(xs) - 1) * q / 100
        lo = int(k); hi = min(lo + 1, len(xs) - 1)
        r[q] = round(xs[lo] + (xs[hi] - xs[lo]) * (k - lo), 4)
    return r


def result_text(block):
    c = block.get('content')
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return '\n'.join(x.get('text', '') for x in c if isinstance(x, dict))
    return ''


def short(label, line):
    return f'{label}:{line}'
