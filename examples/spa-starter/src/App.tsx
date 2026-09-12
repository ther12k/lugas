import { useEffect, useState } from "react";
import { createClient, formBody } from "lugas/client";
import type { AppContract } from "lugas";
import type { createApp } from "../server/app";

type App = ReturnType<typeof createApp>;
type API = AppContract<App>;

// Same-origin typed client: the browser bundle talks to the API served by
// the same Bun process (ADR-0037 hosting contract).
const api = createClient<API>({ baseUrl: "" });

type ProjectView = { kind: "home" } | { kind: "project"; id: string };

function projectFromPath(pathname: string): ProjectView {
  const match = /^\/app\/projects\/([^/]+)$/.exec(pathname);
  return match ? { kind: "project", id: match[1]! } : { kind: "home" };
}

export function App() {
  const [view, setView] = useState(projectFromPath(location.pathname));
  const [log, setLog] = useState<string[]>([]);
  const say = (line: string) => setLog((lines) => [`${new Date().toLocaleTimeString()} ${line}`, ...lines].slice(0, 12));

  // Deep-navigation refresh: the shell serves at /app/*; the view hydrates
  // from the URL the hosting contract preserved.
  useEffect(() => {
    const onPop = () => setView(projectFromPath(location.pathname));
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  const hello = async () => {
    const res = await api.get("/api/hello");
    if (res.ok) say(`hello: ${res.data.message}`);
    else say(`hello failed: ${res.status}`);
  };

  const greet = async () => {
    const res = await api.post("/api/greetings", { body: { name: "Ada" } });
    if (res.ok) say(`mutation: ${res.data.greeting}`);
    else if (res.status === 422) say(`mutation rejected: ${res.error.code}`); // framework 422 branch, no cast
    else say(`mutation failed: ${res.status}`);
  };

  const loginAndMe = async () => {
    // Browser-managed cookie: login sets it (httpOnly); same-origin requests
    // carry it automatically. The typed client needs no header plumbing.
    const login = await fetch("/api/login", { method: "POST" });
    if (!login.ok) return say("login failed");
    const me = await fetch("/api/me");
    if (me.ok) say(`me: ${(await me.json()).id}`); // typed by the guard contract server-side
    else say("me failed after login");
  };

  const upload = async () => {
    const file = new File([new TextEncoder().encode("starter upload payload")], "notes.txt", { type: "text/plain" });
    const res = await api.post("/api/uploads", { body: formBody({ note: "from the browser", file }) });
    if (res.ok) say(`upload: ${res.data.files[0]?.name} (${String(res.data.files[0]?.size)} bytes)`);
    else if (res.status === 413) say(`upload too large: ${res.error?.code ?? "bare 413"}`); // absentable payload (CA-7)
    else say(`upload failed: ${res.status}`);
  };

  const stream = () => {
    const source = new EventSource("/api/events");
    source.addEventListener("tick", (event) => {
      say(`sse tick ${event.data}`);
      if (event.data === '{"n":3}') source.close();
    });
    source.onerror = () => {
      say("sse closed");
      source.close();
    };
  };

  const navigate = (path: string) => {
    history.pushState(null, "", path);
    setView(projectFromPath(path));
  };

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Lugas SPA starter</h1>
      {view.kind === "project" ? (
        <p>
          Deep navigation served the shell — project <strong>{view.id}</strong> (refresh this URL: it stays).
        </p>
      ) : (
        <p>One Bun process: typed API, hashed assets, explicit SPA navigation fallback.</p>
      )}
      <nav style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={hello}>Typed GET</button>
        <button onClick={greet}>Validated mutation</button>
        <button onClick={loginAndMe}>Cookie login + me</button>
        <button onClick={upload}>Multipart upload</button>
        <button onClick={stream}>SSE stream</button>
        <button onClick={() => navigate("/app/projects/42")}>Deep navigate</button>
      </nav>
      <ul style={{ fontFamily: "monospace", fontSize: "0.85rem", paddingLeft: "1rem" }}>
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </main>
  );
}
