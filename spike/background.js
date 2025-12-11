// background.js - Chrome extension background service worker

const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[Kagi Saver BG]', ...args);
}

class BackgroundController {
  constructor() {
    this.offscreenReady = false;
    this.messageQueue = [];
    this.offscreenPath = 'offscreen.html';
    this._resolveOffscreenReady = null;
    this.init();
  }

  init() {
    log('🚀 Background controller initializing');
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  handleMessage(msg, sender, sendResponse) {
    log('← Message:', msg.action || 'unknown', 'from', sender.tab ? 'content' : 'offscreen');

    // Offscreen announcing readiness
    if (msg.action === 'OFFSCREEN_READY') {
      this.onOffscreenReady();
      return false;
    }

    // Content script sending save request
    if (msg.action === 'saveFile' && sender.tab) {
      this.handleSaveFile(msg, sendResponse);
      return true; // async response
    }

    return false;
  }

  async handleSaveFile(msg, sendResponse) {
    try {
      await this.ensureOffscreen();
      log('→ Sending to offscreen:', msg.action);
      const response = await this.sendToOffscreen(msg);
      log('→ Response to content:', response.success ? '✅' : '❌');
      sendResponse(response);
    } catch (e) {
      log('💥 Save error:', e.message);
      sendResponse({ success: false, error: e.message });
    }
  }

  async ensureOffscreen() {
    if (this.offscreenReady) {
      log('✅ Offscreen already ready');
      return;
    }

    try {
      await chrome.offscreen.createDocument({
        url: this.offscreenPath,
        reasons: ['DOM_PARSER'],
        justification: 'File System Access API'
      });
      log('✅ Offscreen document created, waiting for ready signal...');
      
      // Wait for OFFSCREEN_READY message
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Offscreen readiness timeout'));
        }, 5000);

        this._resolveOffscreenReady = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    } catch (e) {
      if (e.message.includes('Only a single offscreen')) {
        log('✅ Offscreen already exists, waiting for ready signal...');
        // Offscreen exists but we may not have received OFFSCREEN_READY yet
        if (this.offscreenReady) {
          return;
        }
        
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            log('⚠️ Timeout waiting for ready, proceeding anyway');
            this.offscreenReady = true;
            resolve();
          }, 3000);

          this._resolveOffscreenReady = () => {
            clearTimeout(timeout);
            resolve();
          };
        });
      }
      log('💥 Offscreen creation error:', e.message);
      throw e;
    }
  }

  onOffscreenReady() {
    log('✅ Offscreen reports ready');
    this.offscreenReady = true;
    if (this._resolveOffscreenReady) {
      this._resolveOffscreenReady();
    }
  }

  sendToOffscreen(msg) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Offscreen response timeout'));
      }, 10000);

      chrome.runtime.sendMessage(msg, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }
}

const controller = new BackgroundController();
