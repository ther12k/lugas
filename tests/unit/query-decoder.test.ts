import { describe, expect, test } from "bun:test";
import { decodeQuery } from "../../src/internal/decode-query";

describe("Deterministic query decoding", () => {
  test("decodes single occurrence keys as strings", () => {
    const query = decodeQuery("?name=Alice&city=Wonderland");
    expect(query["name"]).toBe("Alice");
    expect(query["city"]).toBe("Wonderland");
  });

  test("decodes repeated keys as arrays in source order", () => {
    const query = decodeQuery("?tag=first&tag=second&tag=third");
    expect(query["tag"]).toEqual(["first", "second", "third"]);
  });

  test("preserves empty query values as empty strings without synthesizing undefined", () => {
    const query = decodeQuery("?flag=&empty&set=value");
    expect(query["flag"]).toBe("");
    expect(query["empty"]).toBe("");
    expect(query["set"]).toBe("value");
    expect("absent" in query).toBe(false);
  });

  test("performs zero implicit number, boolean, date, CSV, or JSON coercion", () => {
    const query = decodeQuery("?num=42&bool=true&nil=null&date=2026-08-21&csv=a,b,c&json=%7B%22k%22%3A1%7D");
    expect(query["num"]).toBe("42");
    expect(typeof query["num"]).toBe("string");

    expect(query["bool"]).toBe("true");
    expect(typeof query["bool"]).toBe("string");

    expect(query["nil"]).toBe("null");
    expect(typeof query["nil"]).toBe("string");

    expect(query["date"]).toBe("2026-08-21");
    expect(typeof query["date"]).toBe("string");

    expect(query["csv"]).toBe("a,b,c");
    expect(typeof query["csv"]).toBe("string");

    expect(query["json"]).toBe('{"k":1}');
    expect(typeof query["json"]).toBe("string");
  });

  test("decodes from Request, URL, URLSearchParams, and string formats", () => {
    const fromString = decodeQuery("https://example.com/api?search=test&page=1");
    const fromUrl = decodeQuery(new URL("https://example.com/api?search=test&page=1"));
    const fromReq = decodeQuery(new Request("https://example.com/api?search=test&page=1"));
    const fromParams = decodeQuery(new URLSearchParams("search=test&page=1"));

    const expected = { search: "test", page: "1" };
    expect({ ...fromString }).toEqual(expected);
    expect({ ...fromUrl }).toEqual(expected);
    expect({ ...fromReq }).toEqual(expected);
    expect({ ...fromParams }).toEqual(expected);
  });

  test("handles unicode and encoded characters properly", () => {
    const query = decodeQuery("?query=%E6%97%A5%E6%9C%AC%E8%AA%9E&special=hello%20world%2Bplus");
    expect(query["query"]).toBe("日本語");
    expect(query["special"]).toBe("hello world+plus");
  });

  test("handles empty query strings", () => {
    expect(decodeQuery("")).toEqual({});
    expect(decodeQuery("?")).toEqual({});
  });
});
