# Contextual Bridge - Refactor Status

## Phase 1: Complete ✅ (December 12, 2025)

### Overview
Refactored from clipboard-watch pattern to keyboard-driven architecture with explicit user control.

**Achievement:** Keyboard shortcut Ctrl+B opens modal, then S/L/D/Esc for save/load/directory/exit operations.

**Architecture:** Content script → Background coordinator → Offscreen file handler

---

## Implementation Summary

### Completed Components

#### KeyHandler.js (~350 lines)
**Purpose:** Centralize keyboard event handling, dispatch validated messages to background

**Key Features:**
- Captures Ctrl+B, S, L, D, Esc keys
- Validates events (focused window only, no form elements)
- Dispatches to background with standard message format
- Handles responses (success/cancel/error flows)
- Manages state: `listeningMode`, `currentDirName`
- Shows banner feedback via BannerManager

**Response Handling:**
- `onOpenModal()`: Sets listeningMode based on directory picker result
- `onSave()`: Shows success/error banners with filename
- `onPickDirectory()`: Updates banner with new directory name, keeps listening mode active
- `onCloseModal()`: Exits listening mode

#### background.js (~400 lines)
**Purpose:** Central message router + state coordinator

**Key Features:**
- Handler map pattern (no switch statements)
- FileMarkerParser inlined for MV3 service worker compatibility
- Routes: OPEN_MODAL, SAVE_FILE, LOAD_FILE, PICK_DIRECTORY, CLOSE_MODAL
- Offscreen lifecycle management
- Directory name persistence via chrome.storage.local

**SAVE_FILE Flow:**
1. Parse clipboard content using FileMarkerParser
2. Return error if no filepath marker detected
3. Call `ensureDirectoryViaOffscreen()`
4. Forward to offscreen legacy `saveFile` handler
5. Return `{success, filepath}` or error to KeyHandler

**Design Decision:** Inlined FileMarkerParser class instead of importScripts() due to MV3 service worker limitations.

#### offscreen.js (~180 lines)
**Purpose:** File System Access API wrapper

**Key Features:**
- Owns `dirHandle` (in-memory, not serializable)
- `showDirectoryPicker()` on demand with permission validation
- ENSURE_DIRECTORY action: returns `{success, dirName}` or `{cancelled: true}`
- Legacy `saveFile` action: navigates path, saves file
- **Safety:** Subdirectory navigation uses `{ create: false }` to block recursive path creation

**Permission Handling:**
- Caches dirHandle in-memory
- Validates `readwrite` permission before use
- Re-prompts picker if permission stale/revoked

#### fileMarkerParser.js (~50 lines)
**Purpose:** Extract filepath from clipboard text

**Supported Formats:**
- Comment style: `// path/to/file.js` or `# file.py`
- JSON style: `{"$file": "path/to/file.json"}`

**Regex Fix:** Updated pattern to stop at delimiters (`-`, `//`, `#`, `*`)
- Example: `// file.js - this is a comment` → extracts `file.js`

**Validation:** Filepath must contain extension or path separator

#### bannerManager.js (~100 lines)
**Purpose:** Show temporary UI notifications

**Features:**
- Singleton pattern: `window.BannerManager.show(msg, duration)`
- 5-second default display
- Fade animation
- Injected into page DOM

#### content.js (~150 lines)
**Purpose:** Minimal orchestrator

**Responsibilities:**
- Initialize KeyHandler with debug mode
- Relay logs from offscreen to console
- Delegate all logic to KeyHandler

---

## Message Contracts (Implemented)

### KeyHandler → Background

**OPEN_MODAL**
```javascript
{ action: 'OPEN_MODAL', payload: {}, timestamp: 1702353600000 }
// Response: { success: true, dirName: 'Downloads' }
// Or: { success: false, cancelled: true, error: 'message' }
```

**SAVE_FILE**
```javascript
{ action: 'SAVE_FILE', payload: { content: '// file.js\nconsole.log("hi");' } }
// Response: { success: true, filepath: 'file.js' }
// Or: { success: false, error: 'Could not detect filepath marker' }
```

**PICK_DIRECTORY**
```javascript
{ action: 'PICK_DIRECTORY', payload: {}, timestamp: 1702353600000 }
// Response: { success: true, dirName: 'NewFolder' }
// Or: { success: false, cancelled: true }
```

### Background → Offscreen

**ENSURE_DIRECTORY**
```javascript
{ action: 'ENSURE_DIRECTORY' }
// Response: { success: true, dirName: 'Downloads' }
// Or: { success: false, cancelled: true }
```

**saveFile (legacy)**
```javascript
{ action: 'saveFile', filepath: 'path/to/file.js', content: 'console.log("hi");' }
// Response: { success: true }
// Or: { success: false, error: 'Directory "path" does not exist...' }
```

---

## Storage Schema (Implemented)

**chrome.storage.local:**
```javascript
{
  "dirName": "Downloads"  // Persisted by OPEN_MODAL and PICK_DIRECTORY
}
```

**In-Memory State:**
- `dirHandle` in offscreen.js (not serializable)
- `listeningMode` in KeyHandler.js
- `currentDirName` in KeyHandler.js (for banner display)

---

## Architecture Diagram (Current State)

```
┌─────────────────────────────────────┐
│        User (Any webpage)           │
│  Ctrl+B → Opens Bridge modal        │
│  S/L/D/Esc → Save/Load/Dir/Exit     │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│   KeyHandler.js (Content Script)    │
│  - Capture keyboard events          │
│  - Validate & dispatch              │
│  - Handle responses                 │
│  - Show banner feedback             │
└─────────────┬───────────────────────┘
              │ chrome.runtime.sendMessage()
┌─────────────▼───────────────────────┐
│   background.js (Service Worker)    │
│  - Route messages (handler map)     │
│  - Parse clipboard (FileMarker)     │
│  - Coordinate offscreen             │
│  - Persist dirName                  │
└─────────────┬───────────────────────┘
              │ chrome.runtime.sendMessage()
┌─────────────▼───────────────────────┐
│   offscreen.js (File I/O Handler)   │
│  - Manage dirHandle (in-memory)     │
│  - showDirectoryPicker()            │
│  - Save files (no dir creation)     │
│  - Validate permissions             │
└─────────────────────────────────────┘
```

---

## Design Decisions & Rationale

### 1. Handler Map Pattern (vs Switch)
**Decision:** Use object lookup for message routing in background.js

**Rationale:**
- Extensible (add handlers without touching router)
- Testable (can inject/mock handlers)
- Clean (no break statements)
- Performance negligible for user-driven events

See root `AGENTS.md` for detailed pattern comparison.

### 2. Inlined FileMarkerParser
**Decision:** Embed parser class directly in background.js

**Problem:** `importScripts()` unreliable in MV3 service workers

**Solution:** Copy class definition into background.js file

**Trade-off:** DRY violation, but ensures reliability

### 3. Blocked Directory Creation
**Decision:** Use `{ create: false }` when navigating subdirectories

**Rationale:**
- Prevents accidental deep path creation from typos
- Protects against path traversal issues
- Forces explicit directory structure planning

**User Impact:** Must manually create subdirectories before save

### 4. Directory Handle In-Memory Only
**Decision:** Don't serialize dirHandle to chrome.storage

**Reason:** FileSystemDirectoryHandle not serializable in MV3

**Solution:** Cache in-memory, revalidate permissions, re-prompt if needed

**Stored:** Only `dirName` (string) for banner display

### 5. Response-Driven State Management
**Decision:** KeyHandler sets `listeningMode` based on background responses

**Rationale:**
- Single source of truth (background controls flow)
- Handle cancel/error consistently
- Allow recovery from all states

### 6. Site-Agnostic Naming
**Decision:** Generic component names (KeyHandler, not KagiKeyHandler)

**Rationale:**
- Future multi-site support
- Clear separation of concerns
- Easy to understand for new contributors

---

## Known Limitations (Phase 1)

1. **LOAD_FILE not implemented** - Deferred to Phase 2
2. **No clipboard safety warning** - Stale content detection planned for Phase 2
3. **Subdirectories must exist** - By design (safety feature)
4. **Single parser format** - Multi-parser support planned for Phase 3

---

## Testing Results (Phase 1)

**Tested Scenarios:**
- ✅ First-time use (Ctrl+B → directory picker → save)
- ✅ User cancels picker (exits listening mode cleanly)
- ✅ Save with valid filepath marker (success banner)
- ✅ Save without filepath marker (error banner)
- ✅ Save to subdirectory that doesn't exist (clear error)
- ✅ Change directory with D key (updates banner, stays in listening mode)
- ✅ Exit with Esc (closes modal, clears state)
- ✅ FileMarkerParser regex (strips trailing comments)

**Performance:**
- No race conditions observed
- Offscreen initialization reliable
- Directory picker shows without delay
- Banner transitions smooth

---

## Phase 2: Planned Features

### LOAD_FILE Implementation
**Goal:** Read file from disk → clipboard

**Tasks:**
- [ ] Add offscreen READ_FILE handler
- [ ] Use selected text as filepath hint
- [ ] Fallback to chrome.storage.local lastFilepath
- [ ] Write content to clipboard
- [ ] Update KeyHandler.onLoad() with response handling

### Clipboard Safety Warning
**Goal:** Prevent accidental saves of stale clipboard content

**Tasks:**
- [ ] Track copy events in KeyHandler (hasSeenCopyEvent flag)
- [ ] Check chrome.storage.local for existing dirName on OPEN_MODAL
- [ ] On first Ctrl+B with stale clipboard + no directory:
  - Show: `⚠️ Prefilled clipboard. Set [D]irectory or [E]mpty clipboard`
  - Don't trigger picker automatically
- [ ] Add [E] key handler to clear clipboard

### UX Polish
- [ ] Enhanced error messages (suggest fixes)
- [ ] Show last saved filepath in banner
- [ ] File overwrite confirmation (optional)

---

## Phase 3+: Future Expansion

### Multi-Site Support
- Parser registration system (try multiple formats)
- Site-specific configs via chrome.storage
- MarkdownFileMarker, JSONFileMarker classes
- Parser auto-detection

### Advanced Features
- File history tracking (listen to save events)
- Settings page (keybinding customization)
- Right-click context menu
- Native messaging API support
- PWA implementation (separate from extension)

---

## Architectural Philosophy

### Site-Agnostic Design
All core components use generic names reflecting **function**, not target site:
- `KeyHandler` - Manages keyboard events
- `DirectoryManager` (future) - Handles file system directories
- `ClipboardManager` (future) - Reads/writes clipboard
- `FileMarkerParser` - Parses file markers in text

### Parser Extensibility
FileMarkerParser designed as one implementation of a parser interface:

```javascript
// Current (Phase 1)
class FileMarkerParser {
  parse(text) { /* Extract from: // 📁 /path/to/file.js */ }
}

// Future (Phase 3+)
class MarkdownFileMarker {
  parse(text) { /* Extract from: <!-- file: /path --> */ }
}

// Multi-parser support
const parsers = [new FileMarkerParser(), new MarkdownFileMarker()];
for (const parser of parsers) {
  const result = parser.parse(text);
  if (result) return result;
}
```

---

## Implementation Notes

### Chrome MV3 Constraints
- Service workers cannot use `importScripts()` reliably
- Cannot call `showDirectoryPicker()` from background (no user activation)
- Directory handles not serializable (in-memory only)

### File System Access API
- Requires user activation (keyboard/mouse event)
- Permissions must be revalidated on each session
- Subdirectory navigation separate from file creation

### Content Script Limitations
- Cannot access File System Access API directly
- Must communicate via background → offscreen
- Banner UI injected into page DOM

---

## Promotion Readiness

**Phase 1 Status:** Ready for pre-production review

**Checklist:**
- ✅ Core save workflow functional
- ✅ Error handling complete
- ✅ Safety features in place
- ✅ Documentation updated
- ✅ No known race conditions
- ✅ User can recover from all error states

**Before Promotion:**
- [ ] Complete Phase 2 (LOAD_FILE + safety warning)
- [ ] Add JSDoc type hints for TypeScript prep
- [ ] Create test suite (unit + integration)
- [ ] Security review (permissions, data handling)
- [ ] Performance profiling

---

## Session Handoff

**For next coding session:**
1. Reference this document for Phase 1 implementation details
2. Start Phase 2 with LOAD_FILE in offscreen.js
3. Update ROADMAP.md as features complete
4. Keep message contracts in sync with code

**Known Blockers:** None (Phase 1 complete)

**Open Questions (Phase 2):**
- Should [E] key clear clipboard with confirmation?
- Load fallback: error or picker if no filepath?
- File overwrite: ask every time or remember choice?

---

**Last Updated:** December 12, 2025  
**Phase:** 1 Complete ✅, 2 Planned  
**Contributors:** Human + AI agents  
**Repository:** invite-only, not for public distribution
