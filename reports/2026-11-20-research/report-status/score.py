"""Flags each reply line that names a risk with a settled status word other than the entry's last Status."""
import json, re, sys, glob
reg = sys.argv[1]
truth = {}
for f in glob.glob(reg + '/*.md'):
    for blk in re.split(r'\n(?=- \[.\] \*\*RISK-\d+)', open(f).read()):
        m = re.match(r'- \[.\] \*\*(RISK-\d+)', blk)
        st = re.findall(r'Status:\s*([A-Za-z]+)', blk)
        if m and st: truth[m[1]] = st[-1].lower()
WORDS = ('closed', 'accepted', 'mitigated', 'transferred')
for path in sys.argv[2:]:
    o = json.load(open(path)); text = o.get('result', ''); bad = []
    for line in re.split(r'\n|(?<=\.) ', text):
        ids = set(re.findall(r'RISK-\d+', line)); said = {w for w in WORDS if re.search(r"\b" + w + r"\b", line.lower())}
        for i in ids:
            t = truth.get(i)
            if len(ids) == 1 and said and t in WORDS and t not in said: bad.append(f'{i} truth={t} said={sorted(said)}: {line.strip()[:160]}')
    print(f"{path.split('/')[-1]} cost={o.get('total_cost_usd',0):.3f} ids={len(set(re.findall(r'RISK-\d+', text)))} misstated={len(bad)}")
    for b in bad: print('   ', b)
