---
name: typescript-strict
description: >
  Enforces zero-any strict TypeScript standards.
  Trigger: When writing, refactoring, or reviewing TypeScript code (.ts, .tsx) in api/ or web/.
metadata:
  author: whatsremind-team
  version: "1.0"
---

# TypeScript Strict — Zero `any` Standard

Every type decision is a contract. Weak types are silent runtime bugs.

---

## Rule 1 — Zero `any` Policy

Never use `: any` or `as any`. `: any` disables the compiler and silences defects.

### Before (Antipattern)
```typescript
function parsePayload(data: any): any {
  return data.items;
}

try {
  // ...
} catch (error: any) {
  console.error(error.message);
}
```

### After (Strict)
```typescript
function parsePayload(data: unknown): Record<string, unknown>[] {
  if (typeof data === "object" && data !== null && "items" in data && Array.isArray((data as { items: unknown }).items)) {
    return (data as { items: Record<string, unknown>[] }).items;
  }
  return [];
}

try {
  // ...
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
}
```

---

## Rule 2 — Unknown over Any at Boundaries

When receiving external input (HTTP bodies, query params, SQLite results, JSON.parse):
1. Type as `unknown` or a dedicated interface.
2. Narrow with type guards or validate with Elysia TypeBox (`t.Object`) / schema definitions.

```typescript
function parseJsonSafe<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// Narrowing with type guard:
function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}
```

---

## Rule 3 — Discriminated Unions & Exhaustive Checks

Avoid optional mess when states are mutually exclusive:

```typescript
type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; httpStatus: number };

function handleResult<T>(result: OperationResult<T>): T {
  if (!result.success) {
    throw new Error(`[${result.httpStatus}] ${result.error}`);
  }
  return result.data; // Fully typed T
}
```

---

## Rule 4 — Elysia & Drizzle Strong Typing

- Never use `t.Any()` in Elysia schemas. Use `t.Record(t.String(), t.Unknown())` or explicit `t.Object(...)`.
- Derive types from Drizzle schema:
  `type Channel = typeof channels.$inferSelect;`
  `type NewChannel = typeof channels.$inferInsert;`

---

## Rule 5 — Safe Catch Blocks

`catch` variables in TypeScript must be typed as `unknown`:

```typescript
try {
  await doWork();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Unexpected error occurred";
  return { success: false, errorDetail: message };
}
```

---

## Anti-Patterns Checklist

| Anti-pattern | Problem | Correct Pattern |
|---|---|---|
| `: any` | Turns off type checker | `: unknown` + type guard |
| `as any` | Unsafe type escape hatch | Safe narrowing / validated schema |
| `t.Any()` | Accepts anything at HTTP boundary | `t.Record(...)` or concrete schema |
| `catch (e: any)` | Runtime crash if non-Error thrown | `catch (e: unknown)` + `instanceof Error` |
| `updates: any = {}` | Loose object mutations | `Partial<T>` or strict builder type |
