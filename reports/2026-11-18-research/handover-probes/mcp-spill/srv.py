"""Stub stdio MCP server: tool `big` returns n characters of prose between MARKSTART and MARKEND."""
import sys, json
W='The quick brown fox jumps over the lazy dog near the river bank today. '
def out(m):
    sys.stdout.write(json.dumps(m)+'\n'); sys.stdout.flush()
for line in sys.stdin:
    m=json.loads(line); i=m.get('id'); meth=m.get('method')
    if meth=='initialize': out({'jsonrpc':'2.0','id':i,'result':{'protocolVersion':m['params']['protocolVersion'],'capabilities':{'tools':{}},'serverInfo':{'name':'stub','version':'1'}}})
    elif meth=='tools/list': out({'jsonrpc':'2.0','id':i,'result':{'tools':[{'name':'big','description':'Returns n characters.','inputSchema':{'type':'object','properties':{'n':{'type':'integer'}},'required':['n']}}]}})
    elif meth=='tools/call':
        n=m['params']['arguments']['n']; t=('MARKSTART '+W*(n//len(W)+1))[:n-8]+' MARKEND'
        out({'jsonrpc':'2.0','id':i,'result':{'content':[{'type':'text','text':t}]}})
    elif i is not None: out({'jsonrpc':'2.0','id':i,'result':{}})
