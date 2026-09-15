/**
 * Application-owned task service — the onboarding walkthrough's single
 * owner of task state (ADR-0037: the framework stays out of the app's data
 * layer). Handlers declare routes and map outcomes; this module owns the
 * store and the rules. Swap the Map for Drizzle/Postgres later without
 * touching route declarations (see examples/drizzle for that shape).
 */
import { z } from "zod";

/** Declared once, shared by the route (validation) and the service (input type). */
export const TaskCreateSchema = z.object({
  title: z.string().min(1, "title must not be empty").max(80, "title must be at most 80 characters"),
});

export type TaskCreateInput = z.infer<typeof TaskCreateSchema>;

export type Task = {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly createdAt: string;
};

// Process-lifetime in-memory store: enough to teach the full request path
// (and reset on every restart — say so to readers, don't hide it).
const tasks = new Map<string, Task>();

export function listTasks(): readonly Task[] {
  return [...tasks.values()];
}

export function createTask(input: TaskCreateInput): Task {
  const task: Task = {
    id: crypto.randomUUID(),
    title: input.title,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  tasks.set(task.id, task);
  return task;
}

export type TaskUpdateOutcome = { readonly ok: true; readonly task: Task } | { readonly ok: false; readonly reason: "missing" };

export function completeTask(id: string): TaskUpdateOutcome {
  const task = tasks.get(id);
  if (!task) return { ok: false, reason: "missing" };
  const updated: Task = { ...task, completed: true };
  tasks.set(id, updated);
  return { ok: true, task: updated };
}

export function deleteTask(id: string): boolean {
  return tasks.delete(id);
}
