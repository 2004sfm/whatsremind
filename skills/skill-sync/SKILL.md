---
name: skill-sync
description: >
  Syncs local skills to the official hidden directories of AI agents.
  Trigger: When initializing the project, adding a new skill, or updating the AI agent tools.
metadata:
  author: whatsremind-team
  version: "1.0"
---

## Purpose

Keeps the visible `skills/` directory synchronized with the hidden directories required by local AI agents.

Instead of maintaining duplicate rules for each AI tool, we maintain a single source of truth in the root `/skills` folder, and this script automatically creates symbolic links (symlinks) to the required internal directories.

## Usage

Run the sync script from the root of the project whenever you clone the repository on a new machine or add a new skill directory:

```bash
./skills/skill-sync/sync.sh
```

### What It Does

1. Scans the local `skills/` directory.
2. Checks which AI agent hidden folders exist in your workspace (e.g., `.claude`, `.gemini`).
3. Automatically forces the creation of `.agents/skills` (standard for Antigravity).
4. Creates a symbolic link for each skill into the respective agent's hidden folder.

## Checklist After Modifying Skills

- [ ] Created or updated the `SKILL.md` in the root `skills/` folder.
- [ ] Updated `AGENTS.md`: added/edited the skill row in the **Available Skills** table AND the **Auto-invoke Skills** table if applicable.
- [ ] Ran `./skills/skill-sync/sync.sh`.
- [ ] Verified that the AI agent can read the new rules.

## AGENTS.md Update Rules (MANDATORY)

Whenever a skill is **created** or **significantly edited**, the agent MUST update `AGENTS.md`:

1. **New skill**: Add a row to the `WhatsRemind-Specific Skills` table with name, description, and link.
2. **New auto-invoke trigger**: Add a row to the `Auto-invoke Skills` table mapping the action to the skill.
3. **Renamed/deleted skill**: Update or remove the corresponding rows.
4. **Minor edits** (typo fixes, small clarifications): No `AGENTS.md` update needed.
