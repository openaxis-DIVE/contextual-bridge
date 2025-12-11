# AGENTS.md

## Working Style

**User Preferences:**
- Demands clean, production-ready code first—refactor immediately if code looks "ugly"
- Complete full-file replacements, never nested snippets with inline comments
- No line-number instructions; only full copy-paste entities
- Values speed over politeness; blunt callouts beat gentle suggestions
- Strong opinionated stances on code quality [memory:17]

**Agent Behavior:**
- **Don't overpromise.** Test thoroughly before declaring "done"
- **No hacks.** Avoid magic numbers, timeouts, polling loops—use proper APIs
- **Trim context ruthlessly.** Fresh uploads = fresh eyes; no stale assumptions
- **Call out guesses.** If uncertain, ask for logs/output instead of inventing fixes
- **Learn the taste.** Each refactor = training data for next time [memory:14][memory:15]

## Technical Context

**Stack:**
- Vanilla JavaScript (TypeScript deferred until "ready")
- Chrome MV3 extension (File System Access API + offscreen documents)
- Kagi.com content script + PWA variant planned
- JSDoc type hints as prep for TS migration

**Known Pain Points:**
- Chrome extension race conditions (offscreen initialization timing)
- Message passing across service worker ↔ offscreen boundaries
- Regex edge cases (spaces in filenames, multiple comment styles)

**Project Scope:**
- Invite-only; cheeky/experimental integration
- Not for public search discovery
- Will expand beyond file I/O (native messaging, import/export)

**Code Style:**
- No nested functions beyond lambdas
- Concise variable names (dirHandle, cwd, etc.)
- Explicit error handling over silent failures
- DEBUG flags in all files for visibility

## Next Steps

1. Fix first-save race condition (offscreen lifecycle timing)
2. Add keyboard shortcuts (Ctrl+Shift+K)
3. Native messaging support
4. PWA variant (reuse logic, different APIs)
