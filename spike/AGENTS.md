# AGENTS.md (spike)

Agent-specific guidance for working on the contextual-bridge spike.

---

## Working Style

**User Preferences:**
- Clean, production-ready code first—refactor immediately if ugly
- Full-file replacements only (no snippets with inline comments)
- No line-number instructions; copy-paste entities only
- Speed over politeness; blunt callouts beat gentle suggestions
- Strong opinions on code quality

**Agent Behavior:**
- **Don't overpromise.** Test before declaring "done"
- **No hacks.** Avoid magic numbers, timeouts, polling loops
- **Trim context ruthlessly.** Fresh uploads = fresh eyes
- **Call out guesses.** Ask for logs instead of inventing fixes
- **Learn the taste.** Each refactor = training data

---

## Technical Context

**Stack:**
- Vanilla JavaScript (TypeScript deferred)
- Chrome MV3 extension (File System Access API + offscreen)
- Kagi.com content script (matches in manifest)
- JSDoc type hints as TS prep

**Architecture (Phase 1 Complete):**
KeyHandler (content) → background (router + parser) → offscreen (File I/O)