import { expect, test } from "bun:test";
import { json } from "../../../spikes/type-contract/candidates";

test("phantom response helper runtime stays trivial", () => {
  expect(json(200, { ok: true })).toEqual({ status: 200, body: { ok: true } });
});
