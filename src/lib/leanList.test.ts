import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { leanList } from "./leanList";

const rows = [
  { id: 1, title: "A", description: "long text" },
  { id: 2, title: "B", description: "more long text" },
];

describe("leanList", () => {
  it("strips the given long fields by default", async () => {
    const req = new NextRequest("http://localhost/api/requirements");
    const res = leanList(req, rows, ["description"]);
    const body = await res.json();
    expect(body).toEqual([
      { id: 1, title: "A" },
      { id: 2, title: "B" },
    ]);
  });

  it("keeps long fields when ?expand=full is set", async () => {
    const req = new NextRequest("http://localhost/api/requirements?expand=full");
    const res = leanList(req, rows, ["description"]);
    const body = await res.json();
    expect(body).toEqual(rows);
  });

  it("does not mutate the input rows", async () => {
    const req = new NextRequest("http://localhost/api/requirements");
    leanList(req, rows, ["description"]);
    expect(rows[0]).toHaveProperty("description");
  });
});
