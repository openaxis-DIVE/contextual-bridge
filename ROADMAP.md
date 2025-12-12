# ROADMAP.md

Current focus, completed work, and next steps. Maintained by human + AI agents.

---

## Current Focus: Phase 1 Complete, Phase 2 Planning

**Phase 1 Status:** ✅ Complete (Dec 12, 2025)
- Keyboard-driven save workflow functional
- File System Access API integrated
- Response handling + error flows implemented
- Safety features in place

**Next:** Phase 2 - LOAD_FILE + UX improvements

---

## Recently Completed

### Phase 1: Save Workflow (Dec 12, 2025)
- [x] KeyHandler.js with response handling (success/cancel/error)
- [x] background.js SAVE_FILE implementation (parse → ensure dir → save)
- [x] FileMarkerParser regex fix (stops at delimiters)
- [x] Inlined parser in background.js (MV3 service worker compat)
- [x] Directory persistence via chrome.storage.local
- [x] Banner feedback for all operations
- [x] Safety: blocked subdirectory auto-creation
- [x] offscreen.js permission validation

### Early Spike Work (Dec 11-12, 2025)
- [x] Keyboard event architecture (Ctrl+B modal)
- [x] Banner UI with fade animation
- [x] Message routing (handler map pattern)
- [x] File marker parsing (comment + JSON formats)

### Foundation (Nov-Dec 2025)
- [x] Chrome MV3 extension scaffold
- [x] Offscreen document for File System Access API
- [x] Project structure + documentation framework

---

## Near-Term Backlog (Phase 2)

### LOAD_FILE Implementation
- [ ] Add offscreen READ_FILE handler
- [ ] Use selected text as filepath hint
- [ ] Fallback to chrome.storage.local lastFilepath
- [ ] Write loaded content to clipboard
- [ ] Banner feedback: `✅ Loaded: filename`

### Clipboard Safety Warning
- [ ] Track copy events in KeyHandler (hasSeenCopyEvent flag)
- [ ] Check chrome.storage.local for existing dirName
- [ ] On first Ctrl+B with stale clipboard + no directory:
  - Show: `⚠️ Prefilled clipboard. Set [D]irectory or [E]mpty clipboard`
  - Don't trigger picker automatically
- [ ] Add [E] key handler to clear clipboard

### UX Polish
- [ ] Enhanced error messages (suggest fixes)
- [ ] Show last 3 saved files in banner (optional)
- [ ] File overwrite confirmation (optional)
- [ ] Improve banner timing/transitions

---

## Future Phases

### Phase 3: Multi-Site Support
- [ ] Parser registration system (support multiple formats)
- [ ] Site-specific configs via chrome.storage
- [ ] MarkdownFileMarker parser (GitHub Gists, etc.)
- [ ] Parser auto-detection

### Phase 4: Advanced Features
- [ ] File history UI
- [ ] Settings page (keybinding customization)
- [ ] Right-click context menu
- [ ] Native messaging API support
- [ ] PWA implementation (separate from extension)

---

## Blocked / Needs Decision

**None currently.** Phase 1 decisions resolved:
- ✅ FileMarkerParser loading → inlined in background.js
- ✅ Directory creation safety → blocked with clear error
- ✅ Filepath parsing → regex stops at delimiters

---

## Open Questions

### Phase 2 Decisions Needed:
1. **Empty clipboard key:** Should [E] just clear or show confirmation?
2. **Load fallback:** If no selection + no lastFilepath, show error or picker?
3. **File overwrite:** Ask every time, remember choice, or never ask?

### Phase 3+ Considerations:
- Multi-parser priority order (try JSON first, then comment?)
- Storage quota for file history (how many entries?)
- Settings UI: popup vs. options page?

---

## Metrics / Success Criteria

**Phase 1 (Complete):**
- ✅ End-to-end save workflow functional
- ✅ Error handling for all failure modes
- ✅ No race conditions or timing issues
- ✅ User can recover from all error states

**Phase 2 (Target):**
- [ ] Load workflow symmetric with save
- [ ] Zero accidental saves of stale clipboard
- [ ] Clear error messages with actionable suggestions

---

## Agent Workflow Notes

**After coding session:**
- Move completed items from "Near-Term Backlog" to "Recently Completed"
- Update phase status and dates
- Add any new blockers/questions discovered

**After architectural decisions:**
- Document in `spike/AGENTS.md` or inline code comments
- Update this roadmap with resolution

**When completing phases:**
- Mark phase complete with date
- Create new section in "Recently Completed"
- Update `spike/README.md` status

---

**Last Updated:** December 12, 2025  
**Current Phase:** Phase 1 Complete ✅  
**Next Milestone:** Phase 2 LOAD_FILE + Safety Features
