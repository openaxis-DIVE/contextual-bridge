# PERP.md

## PERP's role in this repo

This repository is used as a testbed for AI‑assisted workflows, with Perplexity ("PERP") acting primarily as a research and workflow‑design assistant.[page:63] PERP is not tied to the runtime behavior of `contextual-bridge`, but to how this project is planned, documented, and evolved.

## What PERP is good for here

- Designing and iterating on:
  - Repository‑level context files (`AGENTS.md`, `ROADMAP.md`).[page:63]
  - Multi‑agent workflows that use `contextual-bridge` as glue between browser context and local tools.
- Researching:
  - Browser extension patterns and security constraints.
  - Native messaging APIs and safe filesystem interaction patterns.
  - Examples of AI‑native development workflows and context management.

When deep research or non‑obvious architectural choices are made with PERP's help, summarize them here and, if needed, link to more detailed notes.

## Today's snapshot (2025‑12‑11)

- Established the **AGENTS.md / ROADMAP.md pattern** for this repo, treating it as:
  - A small, standalone utility outside any monorepo.
  - A reference implementation for AI‑native workflow management.[page:63]
- Decided that:
  - `contextual-bridge` will remain focused on bridging web context → local/native, not general automation.
  - Multi‑agent usage (including PERP) should be coordinated via `AGENTS.md` and `ROADMAP.md` rather than external trackers.

## Conventions for PERP usage

- Mention PERP explicitly in commit messages or comments when:
  - A design decision was substantially shaped by PERP's research or reasoning.
  - A new workflow pattern originates from PERP (e.g. how agents should coordinate on this repo).
- For larger research efforts:
  - Create a markdown file under a future `research-snapshots/` directory.
  - Add a short entry here linking to that snapshot and its implementation status.
