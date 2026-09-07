import { connect } from "node:net";

export type RawResponse = { requestLine: string; status: number; body: string };

/**
 * Sends `target` verbatim as the HTTP/1.1 request-target over a raw TCP
 * connection — no URL parser touches the path between this call and the
 * server. Used to establish raw-request provenance for encoded paths.
 */
export function sendRawRequest(port: number, target: string, method = "GET"): Promise<RawResponse> {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks: Buffer[] = [];
    const requestLine = `${method} ${target} HTTP/1.1`;
    const socket = connect({ host: "127.0.0.1", port });
    socket.on("connect", () => {
      socket.write(`${requestLine}\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`);
    });
    socket.on("data", (data: Buffer) => chunks.push(data));
    socket.on("error", rejectPromise);
    socket.on("close", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const separator = raw.indexOf("\r\n\r\n");
      const head = raw.slice(0, separator);
      let body = raw.slice(separator + 4);
      // Bun may answer Connection: close with chunked framing; decode if present.
      if (/transfer-chunked/i.test(head.split("\r\n")[0] ?? "") || /transfer-encoding:\s*chunked/i.test(head)) {
        body = body
          .split("\r\n")
          .filter((_, index, all) => !(index % 2 === 0 && /^[0-9a-f]+$/i.test(all[index]!)) || index === all.length - 1)
          .join("");
        body = body.replace(/^[0-9a-f]+\r\n/m, "").replace(/\r\n$/, "");
      }
      resolvePromise({
        requestLine,
        status: Number(/^HTTP\/1\.[01] (\d{3})/.exec(raw)?.[1] ?? 0),
        body,
      });
    });
  });
}
