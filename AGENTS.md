# AGENTS.md

## Project overview

`contextual-bridge` is a small utility that connects web application context (AI chats, forums, docs) to the local filesystem and native messaging APIs.[page:61] It is implemented as a Chrome extension plus a PWA, and is intended as a lightweight bridge to support multi‑agent workflows before a more fully integrated setup exists.[page:61]

This repo is intentionally focused and separate from any monorepo so it can evolve independently and be safe to share or open to contributors.[page:61]

## Goals

- Make it easy to capture and move context from browser-based tools (LLMs, forums, docs) into local files or processes.
- Provide a testbed for AI‑assisted workflows (multiple agents, PERP, Claude, etc.).
- Stay small, clear, and easy to reason about for external contributors.

## Non‑goals

- Not a general-purpose automation framework.
- Not tightly coupled to the OpenAxis monorepo; it should remain usable on its own.
- No heavy orchestration layer for agents; that belongs elsewhere.

## Architecture sketch

- **Browser extension (Chrome)**  
  - Injects minimal UI and content scripts for capturing context from web pages.  
  - Communicates with the PWA / backend bridge via messaging.

- **PWA / bridge service**  
  - Receives context payloads from the extension.  
  - Handles persistence, local filesystem access (via native messaging), or forwarding to other tools.

- **Agent workflows**  
  - Designed to be used with multiple AI agents (e.g. PERP, Claude).  
  - Agents can read/write repo files (ROADMAP.md, AGENTS.md, etc.) to coordinate work.

## Conventions

- Keep this repo small and focused; prefer features that improve the core bridge.
- Document new workflows or patterns here when they affect how agents should behave.
- Prefer clear, explicit names over clever abstractions.
- When adding new capabilities, update this file and `ROADMAP.md`.

## How agents should use this repo

- Read this file first to understand purpose and boundaries.
- Read `ROADMAP.md` to know current work, blockers, and next steps.
- When significant design or workflow changes are introduced, add a short note here and update `ROADMAP.md`.

## PERP (Perplexity) notes

- PERP is especially useful for:
  - Researching browser extension patterns, security constraints, and native messaging best practices.
  - Designing multi‑agent workflows that use this bridge as glue.
- If PERP does deep research or designs an important workflow for this repo, capture that in a `PERP.md` file at the root or relevant subdirectory.
