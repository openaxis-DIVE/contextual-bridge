// spike/content.js - Content script with KeyHandler integration

const DEBUG = true;

function log(...args) {
  if (DEBUG) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
    console.log(`[${timestamp}] [Contextual Bridge]`, ...args);
  }
}

// Listen for relay messages from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'LOG_RELAY') {
    log(`← From ${msg.source}:`, ...msg.args);
  }
});

// ============================================================================
// Component Initialization
// ============================================================================

const bannerManager = new BannerManager();
const parser = new FileMarkerParser();

// Initialize KeyHandler for keyboard-driven modal
const keyHandler = new KeyHandler({
  keymap: {
    'Control+B': 'OPEN_MODAL'  // Bridge modal shortcut
  },
  debug: DEBUG,
  focusOnly: true
});

log('🚀 Initializing Contextual Bridge');
keyHandler.init();

// ============================================================================
// Legacy ClipboardWatcher (passive monitoring - can be deprecated Phase 2)
// ============================================================================

class ClipboardWatcher {
  constructor() {
    this.lastClipboard = '';
    this.init();
  }

  init() {
    log('📋 Clipboard watcher initializing (legacy mode)');
    document.addEventListener('copy', this.onCopy.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    bannerManager.show('🔖 Contextual Bridge active', 3000);
  }

  onCopy() {
    // Clipboard might not be ready immediately after copy event
    setTimeout(this.checkClipboard.bind(this, 'copy'), 100);
  }

  onMouseUp(event) {
    // Only check on interactive elements (avoid text selection clicks)
    const target = event.target;
    if (target.matches('a, button, img, [role="button"]')) {
      // No timeout needed for mouseup - it fires after interaction completes
      this.checkClipboard('mouseup');
    }
  }

  async checkClipboard(source) {
    try {
      const text = await navigator.clipboard.readText();

      if (text === this.lastClipboard || text.length === 0) {
        return;
      }

      log(`--- Clipboard changed (${source}) ---`);
      this.lastClipboard = text;

      const parsed = parser.parse(text);
      if (!parsed) return;

      const filename = parsed.filepath.split(/[\/\\]/).pop();
      log('📤 Sending to background:', parsed.filepath);
      bannerManager.show(`📋 Detected: ${filename}`);

      this.saveViaBackground(parsed);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        log('❌ Clipboard error:', err.message);
      }
    }
  }

  saveViaBackground(parsed) {
    const filename = parsed.filepath.split(/[\/\\]/).pop();

    chrome.runtime.sendMessage(
      {
        action: 'saveFile',
        filepath: parsed.filepath,
        content: parsed.content
      },
      this.onSaveResponse.bind(this, filename)
    );
  }

  onSaveResponse(filename, response) {
    if (chrome.runtime.lastError) {
      log('❌ Runtime error:', chrome.runtime.lastError.message);
      bannerManager.show('❌ Extension error');
      return;
    }

    if (response?.success) {
      log('✅ Saved:', filename);
      bannerManager.show(`✅ Saved: ${filename}`);
    } else {
      log('❌ Save failed:', response?.error);
      bannerManager.show(`❌ ${response?.error || 'Unknown error'}`);
    }
  }
}

// ============================================================================
// Lifecycle Management
// ============================================================================

// Initialize when DOM is ready
if (document.body) {
  new ClipboardWatcher();
} else {
  document.addEventListener('DOMContentLoaded', () => new ClipboardWatcher());
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  keyHandler.destroy();
  log('🛑 Contextual Bridge cleaned up');
});
