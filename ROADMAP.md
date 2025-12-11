# contextual-bridge ROADMAP

This file tracks the current focus, upcoming work, and open questions for `contextual-bridge`. It is maintained by both the human owner and AI agents.

## Current focus

- [ ] Define and stabilize the minimal feature set for the initial MVP.
- [ ] Sketch and document the data flow between:
  - Browser extension → PWA → local/native layer.
- [ ] Decide on initial target environments:
  - Chrome only vs. Chromium-based browsers.
  - Desktop focus vs. any mobile support.

## Near‑term backlog

- [ ] **Extension scaffold**
  - Basic Chrome extension structure (manifest, background/service worker, content script).
  - Simple UI affordance for “capture context from this page”.

- [ ] **Bridge API design**
  - Define a minimal payload format for “context packets” (e.g. source URL, selection, metadata).
  - Document how agents are expected to call/use this bridge.

- [ ] **PWA skeleton**
  - Basic PWA shell that can receive messages from the extension.
  - Simple persistence strategy (even in‑memory or local storage for MVP).

## Blocked / needs decision

- [ ] **Security and permissions surface**
  - Question: How aggressive should the extension permissions be (e.g. `all_urls` vs. specific domains)?
  - Needs: Human decision on acceptable trade‑offs between power and review friction.

- [ ] **Persistence strategy**
  - Question: Should MVP write to real local files via native messaging, or start with a simpler in‑browser store?
  - Needs: Human decision based on risk tolerance and time available.

## Future / nice‑to‑have

- [ ] Multi‑agent orchestration examples showing how different assistants can use contextual-bridge.
- [ ] Example configs or snippets for popular agents (PERP, Claude, etc.).
- [ ] Docs and small diagrams for the flow from web page → bridge → local tooling.

## Recently completed

- [x] Clarified project scope and intent in README.[page:61]
- [x] Established initial AI‑workflow conventions via `AGENTS.md` and `ROADMAP.md`.
