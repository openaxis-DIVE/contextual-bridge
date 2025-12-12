// spike/background.js - Service Worker for background coordination

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
    console.log(`[${timestamp}] [Background]`, ...args);
  }
}

// Track offscreen document readiness
let offscreenReady = false;
let offscreenPath = 'offscreen.html';

// ============================================================================
// Offscreen Document Management
// ============================================================================

async function ensureOffscreen() {
  if (offscreenReady) {
    return;
  }

  try {
    // Check if offscreen document already exists
    const offscreenUrl = chrome.runtime.getURL(offscreenPath);
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
      offscreenReady = true;
      log('✅ Offscreen document already exists');
      return;
    }

    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: offscreenPath,
      reasons: ['DOM_PARSER'],
      justification: 'File System Access API'
    });

    offscreenReady = true;
    log('✅ Offscreen document created');

  } catch (error) {
    log('❌ Offscreen creation error:', error.message);
    offscreenReady = false;
  }
}

// Listen for offscreen readiness signal
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'OFFSCREEN_READY') {
    offscreenReady = true;
    log('✅ Offscreen reported ready');
    sendResponse({ success: true });
  }
});

// ============================================================================
// Message Handlers (Handler Map)
// ============================================================================

const messageHandlers = {
  // Legacy action (backward compatibility)
  'saveFile': handleSaveFile_Legacy,

  // Phase 1: KeyHandler actions
  'OPEN_MODAL': handleOpenModal,
  'CLOSE_MODAL': handleCloseModal,
  'SAVE_FILE': handleSaveFile,
  'LOAD_FILE': handleLoadFile,
  'PICK_DIRECTORY': handlePickDirectory,
  'LOG_RELAY_FROM_OFFSCREEN': handleLogRelay
};

/**
 * Default handler for unknown actions
 * @param {string} action - The action name
 * @param {*} payload - The message payload
 * @param {object} sender - The message sender
 * @param {function} sendResponse - Response callback
 */
function handleUnknownAction(action, payload, sender, sendResponse) {
  log('⚠️ Unknown action:', action);
  sendResponse({ error: `Unknown action: ${action}` });
}

// ============================================================================
// Message Routing (Object Lookup Pattern)
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload } = message;
  log(`📨 Received: ${action}`, payload);

  // Look up handler or use default
  const handler = messageHandlers[action] || handleUnknownAction;
  
  // Call handler with correct signature (action, payload, sender, sendResponse)
  handler(action, payload, sender, sendResponse);

  // Return true to indicate async response
  return true;
});

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * Legacy: Save file via offscreen document
 */
function handleSaveFile_Legacy(action, payload, sender, sendResponse) {
  const { filepath, content } = payload;
  const filename = filepath.split(/[\/\\]/).pop();
  log(`💾 Save file (legacy): ${filename}`);

  ensureOffscreen().then(() => {
    chrome.runtime.sendMessage({
      action: 'WRITE_FILE',
      filepath,
      content
    }, (response) => {
      if (chrome.runtime.lastError) {
        log(`❌ Write error: ${chrome.runtime.lastError.message}`);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      if (response?.success) {
        log(`✅ Saved (legacy): ${filename}`);
        sendResponse({ success: true });
      } else {
        log(`❌ Save failed (legacy): ${response?.error}`);
        sendResponse({ success: false, error: response?.error });
      }
    });
  });
}

/**
 * Phase 1: Open modal
 */
function handleOpenModal(action, payload, sender, sendResponse) {
  log('🎯 Opening modal');
  // TODO: Phase 1 continuation - implement modal state management
  sendResponse({ success: true });
}

/**
 * Phase 1: Close modal
 */
function handleCloseModal(action, payload, sender, sendResponse) {
  log('🎯 Closing modal');
  // TODO: Phase 1 continuation - implement modal state management
  sendResponse({ success: true });
}

/**
 * Phase 1: Save file from KeyHandler
 */
function handleSaveFile(action, payload, sender, sendResponse) {
  const { content } = payload;
  log(`💾 Save file (KeyHandler): ${content.length} bytes`);
  // TODO: Phase 1 continuation - extract filepath from content
  sendResponse({
    success: false,
    error: 'Not implemented yet - waiting for Phase 1 DirectoryManager'
  });
}

/**
 * Phase 1: Load file from KeyHandler
 */
function handleLoadFile(action, payload, sender, sendResponse) {
  const { selectedText } = payload;
  log(`📂 Load file (KeyHandler): ${selectedText || 'no selection'}`);
  // TODO: Phase 1 continuation - load from directory
  sendResponse({
    success: false,
    error: 'Not implemented yet - waiting for Phase 1 DirectoryManager'
  });
}

/**
 * Phase 1: Pick working directory
 */
function handlePickDirectory(action, payload, sender, sendResponse) {
  log('📁 Pick directory (KeyHandler)');
  // TODO: Phase 2 - delegate to content script with user activation
  sendResponse({
    success: false,
    error: 'Not implemented yet - Phase 2 feature'
  });
}

/**
 * Relay log messages from offscreen document
 */
function handleLogRelay(action, payload, sender, sendResponse) {
  const { args } = payload || {};
  log('📡 [Offscreen]', ...(args || []));
  sendResponse({ success: true });
}

// ============================================================================
// Initialization
// ============================================================================

log('🚀 Background service worker initialized');

// Attempt to ensure offscreen on startup
ensureOffscreen().catch(err => {
  log('⚠️ Offscreen startup warning:', err.message);
});
