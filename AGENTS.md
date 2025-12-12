# AGENTS.md

## How agents should use this repo

- Read `README.md` first to understand project purpose, goals, and architecture
- Read `ROADMAP.md` to know current work, blockers, and next steps
- When significant design or workflow changes are introduced, add a short note here and update `ROADMAP.md`

## Conventions

- Keep this repo small and focused; prefer features that improve the core bridge
- Document new workflows or patterns here when they affect how agents should behave
- Prefer clear, explicit names over clever abstractions
- When adding new capabilities, update `README.md` and `ROADMAP.md`

## Documentation rhythm

- **End of coding session**: Move completed items from "Current Focus" to "Recently Completed" in `ROADMAP.md`
- **After architectural decisions**: Add notes to `REFACTOR_PLAN.md` or `PERP.md`
- **When completing phases**: Update phase status in refactor documentation

## PERP (Perplexity) notes

- PERP is especially useful for:
  - Researching browser extension patterns, security constraints, and native messaging best practices
  - Designing multi-agent workflows that use this bridge as glue
- If PERP does deep research or designs an important workflow for this repo, capture that in a `PERP.md` file at the root or relevant subdirectory
- Mention PERP explicitly in commit messages or comments when a design decision was substantially shaped by PERP's research or reasoning
