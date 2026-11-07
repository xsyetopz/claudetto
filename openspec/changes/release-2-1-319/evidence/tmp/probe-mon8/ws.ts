// Local WebSocket source for the mon24 probe: sends two text frames 1 s apart, then closes.
Bun.serve({
  port: 18770,
  fetch(req, srv) { return srv.upgrade(req) ? undefined : new Response("ws only", { status: 400 }); },
  websocket: {
    async open(ws) {
      for (const t of ["wsev1", "wsev2"]) { await Bun.sleep(1000); ws.send(t); }
      ws.close();
    },
    message() {},
  },
});
console.log("ws on 18770");
