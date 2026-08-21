import { expect, test } from "bun:test";
import { defineApp, defineModule, empty, guard, json, problem, redirect, route, text } from "lugas";

test("root export map exposes the M1 public values", () => {
  for (const value of [defineApp, defineModule, empty, guard, json, problem, redirect, route, text]) {
    expect(typeof value).toBe("function");
  }
});
