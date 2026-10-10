---
name: code-checkers
description: "Trigger: After making changes to TypeScript/React code (.ts or .tsx files) in the frontend or backend."
---

# Post-Edit Verification Rules

Whenever you write, edit, or modify code, **you must absolutely run** the linter, formatter, and type checker for that environment to ensure you haven't introduced silent errors or code violations.

*Note:* Do not ask the user to run these commands. Do it proactively using the `run_command` tool (with enough WaitMsBeforeAsync for it to finish) and make sure to deliver code that passes all rules.

## Frontend (TypeScript / React)

When editing code in the frontend (`web/src/**/*.ts`, `*.tsx`):

```bash
bun --filter web x tsc --noEmit && bun --filter web run build
```

And for React health/linting audits:
```bash
npx react-doctor@latest web --no-telemetry -y
```

### Action after Running (Frontend):
1. **If it passes successfully**: Continue with your workflow.
2. **If there are TypeScript errors**: Modify code until `tsc --noEmit` passes without errors.
3. **If there are React Doctor errors/warnings**: Resolve them according to the refactor blocks (hooks rules, memory leaks, accessibility).

## Backend (TypeScript / Elysia / Drizzle)

When editing code in the backend (`api/src/**/*.ts`):

```bash
bun --filter api x tsc --noEmit
```

### Action after Running (Backend):
1. **If it passes successfully**: Continue with your workflow.
2. **If there are TypeScript errors**: Fix typing mismatches, schema validation errors, or Elysia route handlers until clean.
