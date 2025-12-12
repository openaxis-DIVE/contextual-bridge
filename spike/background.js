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

// Import FileMarkerParser for parsing clipboard content
// Note: In Manifest V3 service workers, we need to use importScripts
// This will be loaded from the same directory
let FileMarkerParser;
try {
  importScripts('fileMarkerParser.js');
  FileMarkerParser = self.FileMarkerParser || FileMarkerParser;
  log('✅ FileMarkerParser loaded');
} catch (e) {
  log('⚠️ FileMarkerParser load warning:', e.message);
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

  // Offscreen logging
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
// Helper: Call offscreen ENSURE_DIRECTORY
// ============================================================================

async function ensureDirectoryViaOffscreen() {
  await ensureOffscreen();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'ENSURE_DIRECTORY' },
      (response) => {
        if (chrome.runtime.lastError) {
          log('❌ ENSURE_DIRECTORY error:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(response || { success: false });
      }
    );
  });
}

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
 * - Ensure directory via offscreen
 * - Persist dirName in chrome.storage.local
 */
function handleOpenModal(action, payload, sender, sendResponse) {
  log('🎯 Opening modal');

  ensureDirectoryViaOffscreen()
    .then((result) => {
      if (result.success && result.dirName) {
        // Persist directory name for future sessions
        chrome.storage.local.set({ dirName: result.dirName }, () => {
          log('📁 Directory ready:', result.dirName);
          sendResponse({
            success: true,
            dirName: result.dirName
          });
        });
      } else if (result.cancelled) {
        log('⚠️ User cancelled directory picker');
        sendResponse({
          success: false,
          cancelled: true,
          error: 'Directory picker cancelled'
        });
      } else {
        log('❌ Failed to ensure directory:', result.error);
        sendResponse({
          success: false,
          error: result.error || 'Failed to ensure directory'
        });
      }
    })
    .catch((err) => {
      log('💥 ensureDirectoryViaOffscreen error:', err.message);
      sendResponse({
        success: false,
        error: err.message
      });
    });
}

/**
 * Phase 1: Close modal
 */
function handleCloseModal(action, payload, sender, sendResponse) {
  log('🎯 Closing modal');
  // Simple acknowledgment - KeyHandler manages listeningMode state
  sendResponse({ success: true });
}

/**
 * Phase 1: Save file from KeyHandler
 * NOW IMPLEMENTED: Parse content, ensure directory, forward to offscreen
 */
function handleSaveFile(action, payload, sender, sendResponse) {
  const { content } = payload;
  log(`💾 Save file (KeyHandler): ${content?.length || 0} bytes`);

  // Step 1: Parse content using FileMarkerParser
  if (!FileMarkerParser) {
    log('❌ FileMarkerParser not available');
    sendResponse({
      success: false,
      error: 'FileMarkerParser not loaded'
    });
    return;
  }

  const parser = new FileMarkerParser();
  const parsed = parser.parse(content);

  if (!parsed || !parsed.filepath || !parsed.content) {
    log('❌ Could not parse filepath marker from content');
    sendResponse({
      success: false,
      error: 'Could not detect filepath marker in clipboard content'
    });
    return;
  }

  const { filepath, content: body } = parsed;
  log(`📝 Parsed filepath: ${filepath}`);

  // Step 2: Ensure directory via offscreen
  ensureDirectoryViaOffscreen()
    .then((dirResult) => {
      if (!dirResult.success) {
        if (dirResult.cancelled) {
          log('⚠️ Directory picker cancelled during save');
          sendResponse({
            success: false,
            cancelled: true,
            error: 'Directory picker cancelled'
          });
        } else {
          log('❌ Failed to ensure directory:', dirResult.error);
          sendResponse({
            success: false,
            error: dirResult.error || 'Failed to ensure directory'
          });
        }
        return;
      }

      // Step 3: Forward to offscreen saveFile handler (legacy action)
      ensureOffscreen().then(() => {
        chrome.runtime.sendMessage(
          { action: 'saveFile', filepath, content: body },
          (saveResponse) => {
            if (chrome.runtime.lastError) {
              log('❌ Offscreen saveFile error:', chrome.runtime.lastError.message);
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message
              });
              return;
            }

            if (saveResponse?.success) {
              log(`✅ File saved: ${filepath}`);
              sendResponse({
                success: true,
                filepath
              });
            } else {
              log(`❌ Save failed: ${saveResponse?.error}`);
              sendResponse({
                success: false,
                error: saveResponse?.error || 'Unknown save error'
              });
            }
          }
        );
      });
    })
    .catch((err) => {
      log('💥 Save file error:', err.message);
      sendResponse({
        success: false,
        error: err.message
      });
    });
}

/**
 * Phase 1: Load file from KeyHandler
 * NOTE: Still placeholder - deferred to Phase 2
 */
function handleLoadFile(action, payload, sender, sendResponse) {
  const { selectedText } = payload;
  log(`📂 Load file (KeyHandler): ${selectedText || 'no selection'}`);

  // TODO: Phase 2 - implement LOAD_FILE via offscreen
  sendResponse({
    success: false,
    error: 'Not implemented yet - deferred to Phase 2'
  });
}

/**
 * Phase 1: Pick working directory
 * - Force re-run of ENSURE_DIRECTORY via offscreen
 */
function handlePickDirectory(action, payload, sender, sendResponse) {
  log('📁 Pick directory (KeyHandler)');

  // Force a fresh ENSURE_DIRECTORY
  ensureDirectoryViaOffscreen()
    .then((result) => {
      if (result.success && result.dirName) {
        chrome.storage.local.set({ dirName: result.dirName }, () => {
          log('📁 Directory re-selected:', result.dirName);
          sendResponse({
            success: true,
            dirName: result.dirName
          });
        });
      } else if (result.cancelled) {
        log('⚠️ User cancelled directory picker (PICK_DIRECTORY)');
        sendResponse({
          success: false,
          cancelled: true,
          error: 'Directory picker cancelled'
        });
      } else {
        log('❌ Failed to pick directory:', result.error);
        sendResponse({
          success: false,
          error: result.error || 'Failed to pick directory'
        });
      }
    })
    .catch((err) => {
      log('💥 ensureDirectoryViaOffscreen (PICK_DIRECTORY) error:', err.message);
      sendResponse({
        success: false,
        error: err.message
      });
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
