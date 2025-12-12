# spike/README.md

Proof-of-concept Chrome extension implementing keyboard-driven file save/load workflow.

## Status: Phase 1 Complete ✅

**Working:**
- ✅ Keyboard interface (Ctrl+B → S/L/D/Esc)
- ✅ File System Access API (directory picker + save)
- ✅ Filepath marker parsing (`// file.js` or `{"$file": "path"}`)
- ✅ Banner notifications with fade animation
- ✅ Directory persistence (chrome.storage.local)
- ✅ Response handling (success/cancel/error)
- ✅ Safety: subdirectory creation blocked

**Phase 2 Planned:**
- [ ] LOAD_FILE implementation (disk → clipboard)
- [ ] Clipboard safety warning (stale content detection)
- [ ] Enhanced error messages

**Recent Fixes:**
- ✅ FileMarkerParser regex: `// file.js - comment` → `file.js`
- ✅ Service worker: inlined parser (no importScripts)
- ✅ Directory creation: `{ create: false }` for safety

---

## Quick Start

1. Load unpacked extension from `spike/` directory
2. Navigate to kagi.com (or update manifest matches)
3. Press **Ctrl+B** → select directory
4. Copy text with `// filename.ext` marker
5. Press **S** to save

---

## Architecture

KeyHandler (content) → background (router) → offscreen (File I/O)

text

**Files:**
- `KeyHandler.js` - Keyboard events + response handling
- `background.js` - Message routing + FileMarkerParser (inlined)
- `offscreen.js` - File System Access API wrapper
- `fileMarkerParser.js` - Extracts filepath from first line
- `bannerManager.js` - UI notifications
- `content.js` - Minimal orchestrator

**Key Design Choices:**
- Handler map (no switch) in background.js
- FileMarkerParser inlined for MV3 service worker compatibility
- Directory handle cached in-memory (not serializable)
- Subdirectories NOT auto-created (user must create first)

---

## Message Flow

**SAVE_FILE:**
KeyHandler → background (parse filepath) → offscreen (save) → response

text

**OPEN_MODAL / PICK_DIRECTORY:**
KeyHandler → background → offscreen (picker) → persist dirName → response

text

See code comments for detailed message contracts.

---

## Error Handling

| Error | Banner Message | Behavior |
|-------|----------------|----------|
| No filepath marker | `❌ Save failed: Could not detect filepath marker` | Stays in listening mode |
| User cancels picker | `Bridge cancelled (no directory selected)` | Exits listening mode |
| Subdir doesn't exist | `❌ Directory 'name' does not exist. Create manually.` | File not saved |
| Clipboard empty | `Clipboard is empty` | No action |

---

## Development

**Debug logs:** All files have `DEBUG = true` flag
- `[KeyHandler]` - browser console
- `[Background]` - service worker console  
- `[Offscreen]` - relayed to browser console

**Common issues:**
- Directory picker not showing → check offscreen ready
- Wrong save location → press D to re-select directory

---

## Next Steps

See parent `README.md` for project overview and `ROADMAP.md` for planned features.

For AI agents: Read `AGENTS.md` for coding standards.

---

**Last Updated:** December 12, 2025  
**Phase:** 1 Complete, 2 Planned  
**Promotion:** Ready for pre-production review