# WhatsRemind - Repository Guidelines

## How to Use This Guide

- Start here for cross-project norms. WhatsRemind is a monorepo containing frontend (`apps/web`) and backend (`apps/api`) components.
- Each component follows the strict architectural guidelines defined in the skills directory.

## Available Skills

Use these skills for detailed patterns on-demand:

### Generic Skills

| Skill | Description | URL |
|-------|-------------|-----|
| `skill-sync` | Syncs local skills to the official hidden directories of AI agents. | [SKILL.md](skills/skill-sync/SKILL.md) |
| `find-skills` | Helps discover and evaluate agent skills from the ecosystem without bloat. | [SKILL.md](skills/find-skills/SKILL.md) |

### WhatsRemind-Specific Skills

| Skill | Description | URL |
|-------|-------------|-----|
| `code-checkers` | Execute linter, type checks (tsc), and React Doctor audit | [SKILL.md](skills/code-checkers/SKILL.md) |
| `ui-architecture` | UI System, Shadcn/ui patterns, Tailwind, and Button/Modal conventions | [SKILL.md](skills/ui-architecture/SKILL.md) |
| `typescript-strict` | Enforce zero-any policy, explicit schemas, and strict TypeScript contracts | [SKILL.md](skills/typescript-strict/SKILL.md) |

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| After creating/modifying a skill | `skill-sync` |
| Writing or refactoring TypeScript code (.ts, .tsx) | `typescript-strict` |
| After making changes to TypeScript/React code (.ts, .tsx) | `code-checkers` |
| Creating or modifying UI components, modals, styles, or buttons | `ui-architecture` |
| When looking for external skills without installing bloat | `find-skills` |

---

## Project Overview

WhatsRemind is a local WhatsApp reminder & debt collection manager.

| Component | Location | Tech Stack |
|-----------|----------|------------|
| Web (Frontend) | `web/` | React, Vite, Shadcn/ui, Tailwind CSS |
| API (Backend) | `api/` | Bun / Node.js, ElysiaJS, Drizzle ORM, SQLite |
| Database | Local SQLite | `bun:sqlite` / Drizzle ORM |

---

## Architecture & Integrations

- **Core Engine:** Local server running SQLite and WhatsApp API orchestrator.
- **APIs Active:**
  - **Meta Cloud API:** Official WhatsApp Business API integration.
  - **YCloud API:** WhatsApp Business messaging & templates via YCloud v2 API.
- **APIs Deferred:**
  - **Evolution API:** In development (UI shows alert / under construction notice).
- **Excel Sync:**
  - Intelligent header detection algorithm with keyword scoring.
  - Upsert on unique `(code, sheet_name)`.
  - Automatic deactivation (`is_active = 0`) for omitted rows.
