import { createServer, type Server } from "node:net";

const BODY = JSON.stringify([{ id: 1 }, { id: 2 }]);

/** The host drops the connection of any request that does not ask for JSON. */
export const startHost = (): Promise<{ server: Server; url: string }> =>
	new Promise((resolve) => {
		const server = createServer((socket) => {
			socket.once("data", (chunk) => {
				if (!/^accept: application\/json\r$/im.test(chunk.toString())) {
					socket.resetAndDestroy();
					return;
				}
				socket.end(
					`HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: ${BODY.length}\r\nconnection: close\r\n\r\n${BODY}`,
				);
			});
		});
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			const port = typeof address === "object" && address !== null ? address.port : 0;
			resolve({ server, url: `http://127.0.0.1:${port}` });
		});
	});
