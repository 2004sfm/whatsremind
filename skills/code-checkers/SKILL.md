---
name: code-checkers
description: "Trigger: After making changes to TypeScript/React code (.ts or .tsx files) in the frontend or backend."
---

# Post-Edit Verification Rules

Whenever you write, edit, or modify code, **you must run** the type checker, linter, and build commands **strictly for the modified workspace** to ensure you haven't introduced silent errors or code violations.

*Note:* Do not ask the user to run these commands. Do it proactively using the `run_command` tool (with enough WaitMsBeforeAsync for it to finish) and make sure to deliver code that passes all rules.

---

## Workspace Scoping Rule (MANDATORY)

**Do NOT run cross-workspace checks blindly:**
- **Frontend only (`web/` touched)**: Execute ONLY the Frontend checks below. **DO NOT** run backend builds, typechecks, or backend unit tests.
- **Backend only (`api/` touched)**: Execute ONLY the Backend checks below. **DO NOT** run frontend builds or React Doctor.
- **Both workspaces touched**: Execute both sections.

---

## 1. Frontend Checks (TypeScript / React)

When editing code in the frontend (`web/src/**/*.ts`, `*.tsx`):

```bash
bun run build:web
```

And for React health/linting audits:

```bash
npx react-doctor@latest web --no-telemetry -y
```

### Action after Running (Frontend):
1. **If it passes successfully**: Continue with your workflow.
2. **If there are TypeScript errors**: Modify code until `tsc` and `vite build` pass without errors.
3. **If there are React Doctor errors/warnings**: Resolve them according to the refactor blocks (hooks rules, memory leaks, accessibility).

---

## 2. Backend Checks (TypeScript / Elysia / Drizzle)

When editing code in the backend (`api/src/**/*.ts`):

```bash
bun run build:api
```

And if backend route or provider logic with tests was modified:

```bash
bun test --cwd api
```

### Action after Running (Backend):
1. **If it passes successfully**: Continue with your workflow.
2. **If there are TypeScript or build errors**: Fix typing mismatches, schema validation errors, or Elysia route handlers until clean.
