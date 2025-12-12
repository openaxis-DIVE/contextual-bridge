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
      reasons: ['FILE_SYSTEM_ACCESS']
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
// Message Routing (Phase 1 - KeyHandler Integration)
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload } = message;

  log(`📨 Received: ${action}`, payload);

  switch (action) {
    // Legacy action (backward compatibility)
    case 'saveFile':
      handleSaveFile_Legacy(payload, sendResponse);
      break;

    // Phase 1: KeyHandler actions
    case 'OPEN_MODAL':
      handleOpenModal(sender, sendResponse);
      break;

    case 'CLOSE_MODAL':
      handleCloseModal(sender, sendResponse);
      break;

    case 'SAVE_FILE':
      handleSaveFile(payload, sender, sendResponse);
      break;

    case 'LOAD_FILE':
      handleLoadFile(payload, sender, sendResponse);
      break;

    case 'PICK_DIRECTORY':
      handlePickDirectory(payload, sender, sendResponse);
      break;

    default:
      log('⚠️  Unknown action:', action);
      sendResponse({ error: `Unknown action: ${action}` });
  }

  // Return true to indicate async response
  return true;
});

// ============================================================================
// Legacy Handler (backward compatibility with ClipboardWatcher)
// ============================================================================

function handleSaveFile_Legacy(payload, sendResponse) {
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

// ============================================================================
// Phase 1 Handlers (KeyHandler Integration)
// ============================================================================

function handleOpenModal(sender, sendResponse) {
  log('🎯 Opening modal');
  // TODO: Phase 1 continuation - implement modal state management
  sendResponse({ success: true });
}

function handleCloseModal(sender, sendResponse) {
  log('🎯 Closing modal');
  // TODO: Phase 1 continuation - implement modal state management
  sendResponse({ success: true });
}

function handleSaveFile(payload, sender, sendResponse) {
  const { content } = payload;

  log(`💾 Save file (KeyHandler): ${content.length} bytes`);

  // TODO: Phase 1 continuation - extract filepath from content
  // For now, placeholder response
  sendResponse({
    success: false,
    error: 'Not implemented yet - waiting for Phase 1 DirectoryManager'
  });
}

function handleLoadFile(payload, sender, sendResponse) {
  const { selectedText } = payload;

  log(`📂 Load file (KeyHandler): ${selectedText || 'no selection'}`);

  // TODO: Phase 1 continuation - load from directory
  // For now, placeholder response
  sendResponse({
    success: false,
    error: 'Not implemented yet - waiting for Phase 1 DirectoryManager'
  });
}

function handlePickDirectory(payload, sender, sendResponse) {
  log('📁 Pick directory (KeyHandler)');

  // TODO: Phase 2 - delegate to content script with user activation
  // For now, placeholder response
  sendResponse({
    success: false,
    error: 'Not implemented yet - Phase 2 feature'
  });
}

// ============================================================================
// Initialization
// ============================================================================

log('🚀 Background service worker initialized');

// Attempt to ensure offscreen on startup
ensureOffscreen().catch(err => {
  log('⚠️  Offscreen startup warning:', err.message);
});
