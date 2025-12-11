# Contextual Bridge - Architecture Refactor Plan

## Overview
Refactoring from clipboard-watch pattern to keyboard-driven approach with explicit user control.

**Target:** Keyboard shortcut Ctrl+B opens modal, then S/L/D for save/load/pick operations
**Constraint:** File System Access API requires user activation + proper serialization
**Pattern:** Content script → Background coordinator → Offscreen file handler

---

## Phase 1: Foundation - Keyboard + State Management

### Phase 1 Deliverables
- `KeyHandler.js` - Keyboard event capture (Ctrl+B for modal) & message dispatch
- Bridge modal UI (shows S/L/D options when Ctrl+B pressed)
- `background.js` - Refactored with DirectoryManager for state coordination
- Updated architecture diagram & message contracts

### Files to Create/Modify

#### NEW: `KeyHandler.js` (~300 lines)

**Purpose:** Centralize all keyboard event handling, dispatch validated messages to background

**Class Structure:**
```javascript
class KeyHandler {
  constructor(config = {})
    // config: { keymap, debug }
    // keymap: { 'Control+B': 'OPEN_MODAL' }
    // Modal then listens for S/L/D keys

  init()
    // Attach keyboard listeners
    // Only listen when document is focused (prevent background noise)

  // Private handlers
  onOpenModal()
    // Ctrl+B pressed
    // - Show Bridge modal overlay
    // - Listen for S/L/D keypresses
    // - Banner: "Bridge Mode: [S]ave | [L]oad | [D]irectory"

  onSave()
    // S pressed (inside modal)
    // - Check clipboard has content
    // - Send 'SAVE_FILE' to background with current clipboard
    // - Banner feedback
    // - Error handling via banner

  onLoad()
    // L pressed (inside modal)
    // - Check for text selection (try to use as filepath)
    // - If no selection, use lastFilepath from storage
    // - If no lastFilepath, show banner error
    // - Send 'LOAD_FILE' to background with filepath
    // - Background will return content
    // - Auto-copy content to clipboard
    // - Banner: "Loaded: [filename]"

  onPickDirectory()
    // D pressed (inside modal)
    // - Send 'PICK_DIRECTORY' to background
    // - Background will show picker (user activation comes from keyboard event)
    // - Banner confirms: "Directory selected: [name]"

  // Utility
  dispatchToBackground(action, payload)
    // Standard message format: { action, payload, timestamp }
    // Error handling: catch chrome.runtime.lastError, banner it

  validateKeyboardEvent(e)
    // Parse e.ctrlKey, e.key into standardized format
    // Match against keymap
    // Return { action, isValid }
}
```

**Key Design Decisions:**
- Single responsibility: capture → validate → dispatch (no business logic)
- Keymap is configurable (easy to add/change shortcuts later)
- All browser→background messages go through `dispatchToBackground()` (single contract point)
- Banner management delegated to `BannerManager` (already exists)

**Testing Hooks:**
```javascript
// Constructor accepts config, making it testable:
const kh = new KeyHandler({
  keymap: { 'Control+S': 'SAVE' },
  debug: true
});
```

**TODO for Future:**
- [ ] Add key repeat debouncing (if user holds Ctrl+S)
- [ ] Add customizable key bindings via settings
- [ ] Add Bridge modal UI with visual feedback
- [ ] Add modal keyboard listener for S/L/D keys

---

#### REFACTORED: `background.js` (~400 lines)

**Purpose:** Central coordinator for state + message routing

**New Class Structure:**

```javascript
// DirectoryManager - Encapsulates directory handle state & operations
class DirectoryManager {
  constructor()
    // this.dirHandle = null
    // this.dirName = ''
    // this.lastUpdated = null

  async pickDirectory()
    // Cannot be called from background directly (no user activation)
    // Must be called from content script
    // Returns: void (sets internal state)
    // Messages back to content when done
    
    // NOTE: This is a design issue - see Phase 2 section below
    // For now, expect this will be delegated to content via message

  async verifyPermission()
    // Check if stored dirHandle still has 'readwrite' permission
    // Return: boolean
    // If false, invalidate and request new pick

  async getHandle()
    // Returns current dirHandle if valid
    // Or null if invalid/not set
    // Caller is responsible for requesting new pick

  isReady()
    // Quick check: do we have a valid dirHandle?
    // Return: boolean

  getMetadata()
    // Return: { dirName, lastUpdated }
    // For UI display/logging

  // Event hooks for future expansion
  onDirectoryChanged()
    // Fire event that ClipboardManager/history tracking can listen to
    // For now: just log + banner
}

// BackgroundController - Message router + orchestrator
class BackgroundController {
  constructor()
    // this.offscreenReady = false
    // this.offscreenPath = 'offscreen.html'
    // this._resolveOffscreenReady = null
    // this._offscreenPromise = null
    // this.dirManager = new DirectoryManager()

  init()
    // chrome.runtime.onMessage.addListener()

  handleMessage(msg, sender, sendResponse)
    // Route based on msg.action:
    // 'SAVE_FILE' → handleSave()
    // 'LOAD_FILE' → handleLoad()
    // 'PICK_DIRECTORY' → handlePickDirectory()
    // 'OFFSCREEN_READY' → onOffscreenReady()
    // 'LOG_RELAY_FROM_*' → pass through to content (existing)

  async handleSave(msg, sendResponse)
    // msg.filepath, msg.content expected
    // Validate filepath exists
    // Ensure offscreen ready
    // Send to offscreen: { action: 'WRITE_FILE', filepath, content }
    // On success: record lastFilepath in chrome.storage.local
    // Fire dirManager.onDirectoryChanged() event
    // sendResponse({ success, error })

  async handleLoad(msg, sendResponse)
    // msg.filepath expected
    // Ensure directory ready
    // Send to offscreen: { action: 'READ_FILE', filepath }
    // Offscreen returns { content, lastModified }
    // Return to content
    // Content will auto-copy to clipboard (Phase 2)
    // sendResponse({ success, content, error })

  async handlePickDirectory(msg, sendResponse)
    // Content script already has user activation (keyboard event)
    // We just delegate back: "show picker in content script"
    // msg should include tabId
    // Response: { dirHandle } (but can't serialize, so metadata only)
    // Actually: need to rethink this - see Phase 2 section

  async ensureOffscreen()
    // Existing code (unchanged from current)
    // Retry logic for offscreen readiness

  // Existing methods (keep as-is)
  sendToOffscreen(msg)
  onOffscreenReady()
}
```

**Message Contracts (Define these clearly):**

```
KeyHandler → Background:
{
  action: 'SAVE_FILE',
  payload: {
    filepath: string,
    content: string
  },
  timestamp: number
}

KeyHandler → Background:
{
  action: 'LOAD_FILE',
  payload: {
    filepath: string
  },
  timestamp: number
}

KeyHandler → Background:
{
  action: 'PICK_DIRECTORY',
  payload: {},
  timestamp: number
}

Background → Offscreen:
{
  action: 'WRITE_FILE',
  filepath: string,
  content: string
}

Offscreen → Background:
{
  success: boolean,
  lastModified: timestamp,
  error?: string
}

Background → Content (for load):
{
  success: boolean,
  content: string,
  lastModified: timestamp,
  error?: string
}
```

**Storage Schema (chrome.storage.local):**

```javascript
{
  "contextual_bridge:lastFilepath": "/path/to/last/file.js",
  "contextual_bridge:dirMetadata": {
    "name": "Downloads",
    "lastUpdated": 1702353600000
  }
  // Handle itself stays in-memory in DirectoryManager.dirHandle
  // (Can't serialize to storage in MV3)
}
```

**Design Notes:**
- DirectoryManager encapsulates all dir-related state
- BackgroundController routes messages
- Explicit separation: "coordinator" doesn't know about files, just delegates
- Future hooks: `onDirectoryChanged()` event for history tracking

**Testing Hooks:**
```javascript
// Can instantiate separately:
const dirMgr = new DirectoryManager();
await dirMgr.verifyPermission();
// Allows unit testing state logic
```

**TODO for Future:**
- [ ] Implement file history tracking (listen to onDirectoryChanged)
- [ ] Add chrome.storage.local for directory metadata persistence
- [ ] Implement directory validation on extension load
- [ ] Add retry logic if dir permissions revoked

---

### Phase 1 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    USER (Any webpage)                │
│                                                      │
│  Ctrl+B → Opens Bridge modal                        │
│  Then: S (save) / L (load) / D (pick directory)    │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│            KeyHandler.js (Content Script)              │
│  ┌─────────────────────────────────────────────┐      │
│  │ - Capture keyboard events (focused only)    │      │
│  │ - Validate against keymap                   │      │
│  │ - Dispatch to background via sendMessage()  │      │
│  │ - Show banner feedback                      │      │
│  └─────────────────────────────────────────────┘      │
└──────────────────────┬──────────────────────────────────┘
                       │ chrome.runtime.sendMessage()
┌──────────────────────▼──────────────────────────────────┐
│      background.js (Service Worker)                     │
│  ┌───────────────────────────────────────────┐         │
│  │ BackgroundController                      │         │
│  │ - Message router (SAVE_FILE, LOAD_FILE)   │         │
│  │ - Orchestration (ensure offscreen ready)  │         │
│  │ - State management via DirectoryManager   │         │
│  └───────────────────┬───────────────────────┘         │
│                      │                                  │
│  ┌───────────────────▼───────────────────────┐         │
│  │ DirectoryManager                          │         │
│  │ - Store dirHandle (in-memory)             │         │
│  │ - Verify permissions                      │         │
│  │ - Fire events on state changes            │         │
│  └───────────────────┬───────────────────────┘         │
│                      │                                  │
└──────────────────────┼────────────────────────────────────┘
                       │ sendMessage()
┌──────────────────────▼────────────────────────────────────┐
│          offscreen.js (File I/O Handler)                  │
│  - Receives WRITE_FILE, READ_FILE commands               │
│  - Uses dirHandle to read/write files                    │
│  - Returns success + metadata (lastModified)             │
└──────────────────────────────────────────────────────────┘
```

---

### Phase 1 Implementation Notes

**Known Issue - Design Debt:**
The `PICK_DIRECTORY` message is problematic because:
- Background service worker cannot call `showDirectoryPicker()` (no user activation)
- Content script CAN (it has keyboard event)
- But we're trying to centralize in background

**Solution for Phase 2:**
Either:
1. **Option A:** Move picker logic to content script, have it store handle in `chrome.storage.local` (lossy, need to serialize differently)
2. **Option B:** Have background relay "PICK_DIRECTORY" back to content script with user context
3. **Option C:** Pre-pick directory on extension load, store in tab-specific state

**Recommendation:** Option B - Keep architecture clean, have background ask content to do the picking. This maintains separation of concerns.

**Will be addressed in Phase 2 section below.**

---

### Architecture Philosophy: Site-Agnostic Design

Contextual Bridge is intentionally designed to be **site-agnostic**, not tied to any specific platform. This architectural decision ensures long-term flexibility and reusability.

#### Generic Naming Convention
All core components use generic, descriptive names that reflect their **function**, not their target site:
- `KeyHandler` - Manages keyboard events (not "KagiKeyHandler")
- `DirectoryManager` - Handles file system directories
- `ClipboardManager` - Reads/writes clipboard content
- `FileMarkerParser` - Parses file markers in text

This naming makes the codebase immediately understandable and prevents lock-in to a single platform.

#### Parser Extensibility
The `FileMarkerParser` class is designed as one implementation of a **parser interface**. While Phase 1 focuses on the current file marker format (lines starting with `// 📁`), the architecture supports future parsers:

```javascript
// Current parser (Phase 1)
class FileMarkerParser {
  parse(text) {
    // Extract filepath from: // 📁 /path/to/file.js
    // Return: { filepath, content }
  }
}

// Future parser examples (Phase 3+)
class MarkdownFileMarker {
  parse(text) {
    // Extract from: <!-- file: /path/to/file.md -->
  }
}

class JSONFileMarker {
  parse(text) {
    // Extract from JSON metadata block
  }
}

// ClipboardManager accepts any parser
const cm = new ClipboardManager(new MarkdownFileMarker());
```

#### Multi-Site Support Strategy
The extension can support multiple sites/formats by:
1. **Parser registration** - Register multiple parsers, try each in order
2. **Site-specific configs** - Different keybindings per domain (via chrome.storage)
3. **Parser auto-detection** - Analyze clipboard text format to select parser

This design ensures that adding support for GitHub Gists, Notion, or other platforms requires only:
- Implementing a new parser class (~50 lines)
- No changes to core architecture (KeyHandler, DirectoryManager, etc.)

#### Manifest Description
The `manifest.json` reflects this philosophy:
```json
{
  "name": "Contextual Bridge",
  "description": "Site-agnostic file bridge for keyboard-driven save/load operations",
  "version": "0.2.0"
}
```

**Design Principle:** Build for one use case (current file markers), architect for many (any text-based file reference format).

---

## Phase 2: Content Layer - Keyboard Handler + Clipboard Manager

### Phase 2 Deliverables
- `ClipboardManager.js` - Read/write clipboard, resolve filepaths
- `content.js` - Refactored orchestrator, delegates to KeyHandler + ClipboardManager
- Updated message contracts for directory picking

### Preview: `ClipboardManager.js` Structure

```javascript
class ClipboardManager {
  constructor(parser = null)
    // parser: FileMarkerParser instance (or null to use default)
    // Allows for future parsers (MarkdownFileMarker, etc.)

  async readClipboard()
    // navigator.clipboard.readText()
    // Return: { text, timestamp }

  async writeClipboard(content)
    // navigator.clipboard.writeText(content)
    // Banner: "Copied to clipboard"

  parseFilepath(text)
    // Use parser.parse(text) to extract filepath + content
    // Return: { filepath, content } or null if invalid

  resolveLoadFilepath(selection)
    // If selection text is available, check if it's a valid filepath
    // Otherwise, fallback to chrome.storage.local lastFilepath
    // Return: filepath string or null

  getLastFilepath()
    // From chrome.storage.local
}
```

### Preview: Phase 2 `content.js`

```javascript
// Initialize components
const bannerManager = new BannerManager();
const parser = new FileMarkerParser();
const clipboardManager = new ClipboardManager(parser);
const keyHandler = new KeyHandler({
  keymap: {
    'Control+B': 'OPEN_MODAL'
  },
  onAction: handleKeyAction // callback to handle actions
  // Modal will handle S/L/D keys internally
});

async function handleKeyAction(action, context) {
  switch(action) {
    case 'OPEN_MODAL':
      // Show Bridge modal with instructions
      // Modal listens for S/L/D keypresses
      // On keypress, route to appropriate handler
      break;
    case 'SAVE':
      // Triggered by S key in modal
      // clipboardManager.readClipboard()
      // clipboardManager.parseFilepath()
      // Send to background
      break;
    case 'LOAD':
      // Triggered by L key in modal
      // clipboardManager.resolveLoadFilepath()
      // Send to background
      // On response, clipboardManager.writeClipboard()
      break;
    case 'PICK_DIR':
      // Triggered by D key in modal
      // Ask user to pick directory
      // Store in chrome.storage.local
      // Send to background to validate
      break;
  }
}
```

### Phase 2 Design Questions (to resolve in next session)

1. **Parser Flexibility:**
   - Should ClipboardManager accept multiple parsers?
   - Or hardcode FileMarkerParser for now?
   - Recommendation: Accept constructor param, default to FileMarkerParser

2. **Directory Picking Delegation:**
   - How should content script request a directory pick?
   - Should it show a UI button/banner?
   - Or just call `showDirectoryPicker()` directly on Ctrl+D?
   - Recommendation: Direct call on Ctrl+D (cleaner flow)

3. **Error Cascading:**
   - If load fails (file not found), should we clear lastFilepath?
   - Or keep it so user can retry with different directory?
   - Recommendation: Keep it, let user manually pick new dir with Ctrl+D

---

## Phase 3: File Operations - Offscreen Refactor

### Phase 3 Deliverables
- `offscreen.js` - Simplified to read/write only, no picker logic
- Message handler for WRITE_FILE + READ_FILE

### Preview: Phase 3 `offscreen.js` Structure

```javascript
class OffscreenFileHandler {
  constructor()
    // this.dirHandle = null (received from background)

  async handleMessage(msg)
    // msg.action: 'WRITE_FILE' or 'READ_FILE'
    // msg.filepath: string
    // msg.content: string (for WRITE only)

  async writeFile(filepath, content)
    // Navigate through dirHandle to filepath
    // Create directories as needed
    // Write file
    // Verify write via lastModified check
    // Return: { success, lastModified, error }

  async readFile(filepath)
    // Navigate through dirHandle to filepath
    // Read file content
    // Get lastModified
    // Return: { success, content, lastModified, error }

  async getDirectoryHandle()
    // Request dirHandle from background
    // Store in-memory
}
```

### Phase 3 Notes

- No more `showDirectoryPicker()` in offscreen
- No more retry logic for directory picking
- Pure file I/O handler
- Can add verification: compare file size before/after write

**TODO for Future:**
- [ ] Add file checksum verification (hash before/after)
- [ ] Add support for nested directories creation
- [ ] Add support for file metadata (permissions, timestamps)

---

## Testing Strategy

### Phase 1 Testing
```javascript
// KeyHandler unit tests
const kh = new KeyHandler({ keymap: { 'Control+S': 'SAVE' } });
// Simulate keyboard event
const evt = new KeyboardEvent('keydown', { ctrlKey: true, key: 'S' });
// Check message dispatch

// DirectoryManager unit tests
const dm = new DirectoryManager();
dm.isReady(); // → false
// Mock dirHandle
dm.dirHandle = mockHandle;
dm.isReady(); // → true
```

### Phase 2 Testing
```javascript
// ClipboardManager unit tests
const cm = new ClipboardManager(mockParser);
await cm.readClipboard(); // → mock clipboard content
cm.parseFilepath(text); // → { filepath, content }

// Message flow tests
Send SAVE_FILE message → Check Background coordination
```

### Phase 3 Testing
```javascript
// OffscreenFileHandler unit tests
const ofh = new OffscreenFileHandler();
ofh.dirHandle = mockDirHandle;
await ofh.writeFile('test.js', 'content'); // → { success, lastModified }
```

---

## Future Expansion Hooks

### Currently Planned
- [ ] File history tracking (listen to DirectoryManager.onDirectoryChanged())
- [ ] Directory persistence across extension reloads
- [ ] Settings UI for keybinding customization
- [ ] Right-click context menu for file operations

### Architectural Readiness
- **ClipboardManager:** Ready for multiple parsers (MarkdownFileMarker, JSONFileMarker, etc.)
- **DirectoryManager:** Ready for file history event tracking
- **KeyHandler:** Ready for customizable keybindings
- **OffscreenFileHandler:** Ready for checksum verification

---

## Dependencies & Permissions

### Required (Already have)
- `clipboardRead` - For Ctrl+L (load from clipboard)
- `storage` - For chrome.storage.local (lastFilepath, dirMetadata)
- `offscreen` - For file I/O
- Manifest v3 - Service workers instead of background page

### May Need (Phase 2+)
- `clipboardWrite` - For auto-copy on load (check if needed)

---

## Session Handoff Notes

For next session resuming from this document:

1. **Reference the Architecture Diagram** - Keep message contracts in sync
2. **Test each phase independently** - Phase 1 before Phase 2
3. **Update this document** as decisions change
4. **Add implementation notes** to each section as you code
5. **Keep TODOs up to date** - Mark completed items [x]

### Known Blockers / Design Decisions Pending
- [ ] Directory picker delegation (Phase 2) - Options A/B/C outlined above
- [ ] Parser flexibility in ClipboardManager - Recommend constructor param
- [ ] File verification strategy in OffscreenFileHandler - lastModified vs checksum

---

## Summary Timeline

| Phase | Files | LOC | Session | Notes |
|-------|-------|-----|---------|-------|
| 1 | KeyHandler.js, background.js | ~700 | This | Foundation - keyboard + coordination |
| 2 | ClipboardManager.js, content.js | ~600 | Next | Integrate clipboard, resolve picker issue |
| 3 | offscreen.js | ~250 | Next | Simplify to pure file I/O |

**Total refactor:** ~1550 lines, 3 focused sessions
**End state:** Clean keyboard-driven UI, testable components, future-proof architecture
