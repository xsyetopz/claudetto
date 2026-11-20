import re,subprocess,sys
sys.argv
exec(open(__import__("os").path.dirname(__import__("os").path.abspath(__file__))+"/apply_reqs.py").read().split("for f in")[0])
out=[]
for (f,n),(oid,why) in outs.items():
    old=subprocess.check_output(["git","show",f"HEAD:plans/rebuild/prd/{f}.md"],text=True).split("\n")
    for i,l in enumerate(old):
        m=re.match(r"- \[ \] \*\*(REQ-\w+-"+n+r")\*\* (.*)",l)
        if m and m.group(1).startswith("REQ-"+f.upper()):
            block=[ "- [x] **OUT-%d** Out (%s; moved from %s in prd/%s.md): %s"%(oid,why,m.group(1),f,m.group(2))]
            j=i+1
            while old[j].startswith("  "): block.append(old[j]); j+=1
            out.append("\n".join(block))
open(__import__("os").environ["TMPDIR"]+"/outs.md","w").write("\n\n".join(out)+"\n")
