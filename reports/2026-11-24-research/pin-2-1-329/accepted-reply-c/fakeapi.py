# Fake API on 127.0.0.1: logs only which credential headers arrived, never their values.
import sys, json, hashlib
from http.server import BaseHTTPRequestHandler, HTTPServer
log, expect = sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else "")
class H(BaseHTTPRequestHandler):
    def _go(self):
        n = int(self.headers.get("content-length") or 0)
        if n: self.rfile.read(n)
        a = self.headers.get("authorization"); k = self.headers.get("x-api-key")
        rec = {"method": self.command, "path": self.path.split("?")[0],
               "authorization": a is not None, "scheme": (a.split(" ")[0] if a else None),
               "authorization_is_expected_dummy": (a == "Bearer " + expect) if (a and expect) else None,
               "x_api_key": k is not None, "x_api_key_is_expected_dummy": (k == expect) if (k and expect) else None}
        open(log, "a").write(json.dumps(rec) + "\n")
        body = json.dumps({"type": "error", "error": {"type": "authentication_error", "message": "fake endpoint"}}).encode()
        self.send_response(401); self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(body))); self.end_headers(); self.wfile.write(body)
    do_GET = do_POST = do_HEAD = do_PUT = do_OPTIONS = _go
    def log_message(self, *a): pass
HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
