import { useEffect, useState, type FormEvent } from "react";
import { createClient, formBody } from "lugas/client";
import type { AppContract } from "lugas";
import type { createApp } from "../server/app";
import type { Task } from "../server/tasks";
import "./App.css";

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

/** The onboarding walkthrough: one resource, every UI state rendered explicitly. */
function TasksPanel({ say }: { say: (line: string) => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [tasks, setTasks] = useState<readonly Task[]>([]);
  const [title, setTitle] = useState("");
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [authRequired, setAuthRequired] = useState(false);

  const load = async () => {
    setStatus("loading");
    const res = await api.get("/api/tasks");
    if (res.ok) {
      setTasks(res.data.tasks);
      setStatus("ready");
    } else {
      setStatus("error"); // typed failure branch: the UI owns an error state
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors([]);
    const res = await api.post("/api/tasks", { body: { title } });
    if (res.ok) {
      setTasks((current) => [res.data, ...current]);
      setTitle("");
    } else if (res.status === 422) {
      // The framework's validated-mutation failure is a typed outcome:
      // Problem Details with an issues[] the form can display inline.
      setFieldErrors((res.error.issues ?? []).map((issue) => issue.message));
    } else {
      say(`create failed: ${res.status}`);
    }
  };

  const complete = async (task: Task) => {
    // Parameterized routes keep their :pattern key at the call site; actual
    // values travel in the params slot (typed against the route contract).
    const res = await api.post("/api/tasks/:id/complete", { params: { id: task.id } });
    if (res.ok) setTasks((current) => current.map((t) => (t.id === task.id ? res.data : t)));
    else if (res.status === 401) setAuthRequired(true); // protected operation, unauthorized state
    else if (res.status === 404) void load(); // stale list: converge to server truth
    else say(`complete failed: ${res.status}`);
  };

  const remove = async (task: Task) => {
    const res = await api.delete("/api/tasks/:id", { params: { id: task.id } });
    if (res.ok) setTasks((current) => current.filter((t) => t.id !== task.id));
    else if (res.status === 401) setAuthRequired(true);
    else if (res.status === 404) void load();
    else say(`delete failed: ${res.status}`);
  };

  const login = async () => {
    // Browser-managed cookie: login sets it (httpOnly); same-origin requests
    // carry it automatically. The typed client needs no header plumbing.
    const res = await fetch("/api/login", { method: "POST" });
    if (res.ok) {
      setAuthRequired(false);
      say("signed in — protected task actions are enabled");
    } else {
      say("login failed");
    }
  };

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2>Your first feature: a task list</h2>

      {authRequired && (
        <p role="alert" style={{ color: "#8a1c1c" }}>
          Completing or deleting a task requires a session. <button onClick={login}>Sign in</button>
        </p>
      )}

      <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="New task title (1–80 characters)"
          aria-label="Task title"
          style={{ flex: 1, font: "inherit", padding: "0.35rem 0.6rem" }}
        />
        <button type="submit">Add task</button>
      </form>
      {fieldErrors.length > 0 && (
        <ul style={{ color: "#8a1c1c", margin: "0.35rem 0 0" }}>
          {fieldErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {status === "loading" && <p>Loading tasks…</p>}
      {status === "error" && (
        <p role="alert" style={{ color: "#8a1c1c" }}>
          Could not load tasks. <button onClick={load}>Retry</button>
        </p>
      )}
      {status === "ready" && tasks.length === 0 && <p>No tasks yet — add the first one above.</p>}
      {status === "ready" && tasks.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: "0.75rem" }}>
          {tasks.map((task) => (
            <li key={task.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.3rem 0" }}>
              <span style={{ textDecoration: task.completed ? "line-through" : "none", flex: 1 }}>{task.title}</span>
              <button onClick={() => complete(task)} disabled={task.completed}>
                Complete
              </button>
              <button onClick={() => remove(task)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
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

      <TasksPanel say={say} />

      <section>
        <h2>More capabilities</h2>
        <p style={{ color: "#555" }}>
          Follow-on demonstrations — none of these are needed for your first feature above.
        </p>
        <nav style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={hello}>Typed GET</button>
          <button onClick={greet}>Validated mutation</button>
          <button onClick={loginAndMe}>Cookie login + me</button>
          <button onClick={upload}>Multipart upload</button>
          <button onClick={stream}>SSE stream</button>
          <button onClick={() => navigate("/app/projects/42")}>Deep navigate</button>
        </nav>
      </section>

      <ul style={{ fontFamily: "monospace", fontSize: "0.85rem", paddingLeft: "1rem" }}>
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </main>
  );
}
