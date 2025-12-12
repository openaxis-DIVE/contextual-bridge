# README.md (project overview)
# contextual-bridge

Bridges web application context (AI chats, forums, docs) to local filesystem and native messaging APIs. Chrome extension + PWA implementations.

## Project overview

`contextual-bridge` is a small utility that connects web application context (AI chats, forums, docs) to the local filesystem and native messaging APIs. It is implemented as a Chrome extension plus a PWA, and is intended as a lightweight bridge to support multi-agent workflows before a more fully integrated setup exists.

This repo is intentionally focused and separate from any monorepo so it can evolve independently and be safe to share or open to contributors.

## Goals

- Make it easy to capture and move context from browser-based tools (LLMs, forums, docs) into local files or processes.
- Provide a testbed for AI-assisted workflows (multiple agents, PERP, Claude, etc.).
- Stay small, clear, and easy to reason about for external contributors.

## Non-goals

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

## Project phases

- **Spike**: Experimental work in `spike/` directory, proof-of-concept validation
- **Pre-production**: Validated, tested, ready for promotion to root level
- **Production**: Promoted to root-level project structure with standard directory layout and test suite

## Getting started

- Read `AGENTS.md` for agent-specific guidance and collaboration patterns
- Read `ROADMAP.md` for current work, blockers, and next steps
- Read `REFACTOR_PLAN.md` for detailed implementation specifications and architecture decisions
