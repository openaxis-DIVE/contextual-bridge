# contextual-bridge

Bridge web application context (AI chats, forums, docs) to local filesystem and native messaging APIs.

## Status: Spike / Proof of Concept

**Working:**
- ✅ Clipboard monitoring on Kagi.com
- ✅ Parse `// filename.ext` or `{"$file": "path.json"}` formats
- ✅ File System Access API (directory picker + save)
- ✅ Chrome MV3 extension structure
- ✅ 8s notification banners with fade animation

**Known Issues:**
- ⚠️ First save attempt races (works on 2nd try)
- ⚠️ Offscreen document initialization timing

**Roadmap:**
- [ ] Fix first-save race condition
- [ ] Keyboard shortcuts (Ctrl+Shift+K candidate)
- [ ] Native messaging API support
- [ ] PWA implementation (duplicate logic, different APIs)
- [ ] Import from filesystem → clipboard
- [ ] Support additional AI chat platforms

## Architecture

- `content.js` - Clipboard parser + banner UI (runs on page)
- `background.js` - Message routing + offscreen lifecycle (service worker)
- `offscreen.html` - Inline File System Access API (isolated DOM context)
- `manifest.json` - MV3 permissions + content script config

## Dev Notes

- Vanilla JS only (TypeScript prep: JSDoc type hints planned)
- DEBUG=true in all files for development
- Offscreen script inlined in HTML to avoid load failures
- No browser storage (no localStorage/sessionStorage due to sandbox)

**Invite-only repo. Not for public distribution.**
