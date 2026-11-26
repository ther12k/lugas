/**
 * uploads example smoke (CA-25): bounded multipart — successful upload
 * reporting, the per-file size limit, the file-count limit, and the app
 * body budget — all via fetch FormData.
 */
import { runSmoke, serveApp, check, jsonAt, matches } from "../smoke-helpers";
import { app } from "./app";

await runSmoke("uploads", async () => {
  const { base, stop } = serveApp(app);
  try {
    const form = new FormData();
    form.append("note", "hello");
    form.append("doc", new Blob([new TextEncoder().encode("file content")], { type: "text/plain" }), "README.md");
    const saved = await jsonAt(await fetch(`${base}upload`, { method: "POST", body: form }), 201, "POST /upload");
    matches(
      saved,
      { note: "hello", saved: [{ field: "doc", filename: "README.md", type: "text/markdown", size: "file content".length }] },
      "POST /upload fields (type derived from the filename)",
    );

    const tooBig = new FormData();
    tooBig.append("doc", new Blob([new Uint8Array(300 * 1024)], { type: "application/octet-stream" }), "big.bin");
    check((await fetch(`${base}upload`, { method: "POST", body: tooBig })).status === 413, "file > 256KiB rejected 413");

    const tooMany = new FormData();
    for (let i = 0; i < 5; i++) {
      tooMany.append(`f${i}`, new Blob(["x"], { type: "text/plain" }), `f${i}.txt`);
    }
    const tooManyRes = await fetch(`${base}upload`, { method: "POST", body: tooMany });
    check(tooManyRes.status === 413, `>4 files rejected 413 (got ${tooManyRes.status})`);
    check((tooManyRes.headers.get("content-type") ?? "").includes("application/problem+json"), ">4 files problem type");

    const overBudget = new FormData();
    overBudget.append("doc", new Blob([new Uint8Array(1200 * 1024)], { type: "application/octet-stream" }), "huge.bin");
    check((await fetch(`${base}upload`, { method: "POST", body: overBudget })).status === 413, "body > 1MiB budget rejected 413");
  } finally {
    stop();
  }
});
