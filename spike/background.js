// background.js - NO CRASH
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[Kagi Saver BG]', ...args);
}

let offscreenReady = false;

async function ensureOffscreen() {
  if (offscreenReady) return;
  
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'File System Access API'
    });
    log('✅ Offscreen document created');
    offscreenReady = true;
  } catch (e) {
    if (e.message.includes('Only a single offscreen')) {
      offscreenReady = true;
      log('✅ Offscreen already exists');
    } else {
      log('💥 Offscreen error:', e.message);
      throw e;
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  log('← Message:', msg.action || 'unknown', 'from', sender.tab ? 'content' : 'offscreen');
  
  // Offscreen responses - pass through
  if (!sender.tab && msg.success !== undefined) {
    log('→ Offscreen response:', msg.success ? '✅' : '❌');
    return false;
  }
  
  // Content requests
  if (msg.action === 'saveFile' && sender.tab) {
    ensureOffscreen()
      .then(() => chrome.runtime.sendMessage(msg))
      .then(response => {
        log('→ Response to content:', response?.success ? '✅' : '❌');
        sendResponse(response);
      })
      .catch(e => {
        log('💥 Chain error:', e.message);
        sendResponse({ success: false, error: e.message });
      });
    return true;
  }
  
  return false;
});
