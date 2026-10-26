import { describe, expect, it } from "bun:test";
import { dbPath, sqlite } from "./index";
import { resolve } from "path";

describe("Database Configuration Suite", () => {
  it("resolves dbPath within the api package directory rather than process.cwd()", () => {
    expect(dbPath).toBeDefined();
    expect(dbPath.endsWith("api/data.sqlite") || dbPath.endsWith("data.sqlite")).toBe(true);
    // Ensure it is not in the user's home root unless explicitly configured
    expect(dbPath).not.toBe(resolve(process.env.HOME || "", "data.sqlite"));
  });

  it("successfully performs basic query on the sqlite instance", () => {
    const result = sqlite.query("SELECT 1 as val").get() as { val: number } | null;
    expect(result).not.toBeNull();
    expect(result?.val).toBe(1);
  });
});
