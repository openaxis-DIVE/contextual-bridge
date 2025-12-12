# AGENTS.md

## How agents should use this repo

- Read `README.md` first to understand project purpose, goals, and architecture
- Read `ROADMAP.md` to know current work, blockers, and next steps
- When significant design or workflow changes are introduced, add a short note here and update `ROADMAP.md`

## For AI agents reading this

When working on this project, identify which **platform** you are running on and read the corresponding guidance file:
- If you are on **Perplexity (PERP)**, read `PERP.md`
- If you are on **Kagi (KAGI)**, read `KAGI.md`
- If you are on **GitHub (GITHUB)**, read `GITHUB.md`
- If you are on **VSCode (COPILOT)**, read `COPILOT.md`

If you are unclear which platform you are on, please ask the human owner. We can then add platform awareness to your system prompt/directives so future sessions know automatically.

This ensures you're following the patterns and constraints specific to your platform and capabilities.

## Conventions

- Keep this repo small and focused; prefer features that improve the core bridge
- Document new workflows or patterns here when they affect how agents should behave
- Prefer clear, explicit names over clever abstractions
- When adding new capabilities, update `README.md` and `ROADMAP.md`

## Documentation rhythm

- **End of coding session**: Move completed items from "Current Focus" to "Recently Completed" in `ROADMAP.md`
- **After architectural decisions**: Add notes to `REFACTOR_PLAN.md` or platform-specific file
- **When completing phases**: Update phase status in refactor documentation

## Agent-specific guidance

For platform-specific directives and optimal usage patterns, see the platform-specific files listed above in "For AI agents reading this".
