---
name: find-skills
description: Helps discover and evaluate agent skills from the open agent skills ecosystem when looking to extend capabilities.
---

# Find Skills

This skill helps you discover and evaluate skills from the open agent skills ecosystem.

## When to Use This Skill

Use this skill when:
- Exploring whether an existing skill addresses a specific domain need (e.g. specialized linting, auth, etc.).
- Needing to inspect ecosystem solutions without installing unnecessary bloat.

## What is the Skills CLI?

The Skills CLI (`npx skills`) is the package manager for the open agent skills ecosystem.

**Key commands:**
- `npx skills find [query] [--owner <owner>]` - Search for skills interactively or by keyword
- `npx skills add <package>` - Install a skill
- `npx skills update` - Update installed skills

**Policy:**
Do NOT install unnecessary skills. Only install if explicitly agreed upon and strictly relevant to project requirements.
