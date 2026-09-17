/**
 * websockets example smoke (CA-25): guard-gated upgrade — plain 401 before
 * the handshake, then welcome/echo frames on the accepted socket.
 */
import { runSmoke, serveApp, check } from "../smoke-helpers";
import { app } from "./app";

function wsUrl(base: string): string {
  return base.replace(/^http/, "ws");
}

function nextMessage(socket: WebSocket, label: string, timeoutMs = 5_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`check failed: ${label} timed out`)), timeoutMs);
    socket.addEventListener(
      "message",
      (event) => {
        clearTimeout(timer);
        resolve(String(event.data));
      },
      { once: true },
    );
  });
}

await runSmoke("websockets", async () => {
  const { base, stop } = serveApp(app);
  try {
    const rejected = await fetch(`${base}echo`);
    check(rejected.status === 401, `missing token status (got ${rejected.status})`);

    const socket = new WebSocket(`${wsUrl(base)}echo?token=secret`);
    const opened = new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("check failed: websocket open")), { once: true });
    });
    await opened;

    const welcome = await nextMessage(socket, "welcome frame");
    check(welcome === "welcome usr_demo", `welcome frame (got ${welcome})`);

    socket.send("hello");
    const echo = await nextMessage(socket, "echo frame");
    check(echo === "echo to usr_demo: hello", `echo frame (got ${echo})`);

    await new Promise<void>((resolve) => {
      socket.addEventListener("close", () => resolve(), { once: true });
      socket.close(1000);
    });
  } finally {
    stop();
  }
});
