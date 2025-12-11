// background.js - Chrome extension background service worker

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
    const message = `[${timestamp}] [Kagi Saver BG] ${args.join(' ')}`;
    console.log(message);
    
    // Relay to content script
    chrome.tabs.query({ url: 'https://kagi.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'LOG_RELAY', 
          source: 'BG',
          args: args 
        }).catch(() => {}); // Ignore errors if content not ready
      });
    });
  }
}

class BackgroundController {
  constructor() {
    this.offscreenReady = false;
    this.offscreenPath = 'offscreen.html';
    this._resolveOffscreenReady = null;
    this._offscreenPromise = null;
    this.init();
  }

  init() {
    log('🚀 Background controller initializing');
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

handleMessage(msg, sender, sendResponse) {
  // Relay offscreen logs to content
  if (msg.action === 'LOG_RELAY_FROM_OFFSCREEN') {
    log(`← From Offscreen:`, ...msg.args);
    return false;
  }

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

    // If we're already waiting for offscreen to be ready, don't create it again
    if (this._offscreenPromise) {
      log('⏳ Waiting for existing offscreen...');
      return this._offscreenPromise;
    }

    this._offscreenPromise = this._createOffscreen();
    return this._offscreenPromise;
  }

  async _createOffscreen() {
    try {
      await chrome.offscreen.createDocument({
        url: this.offscreenPath,
        reasons: ['DOM_PARSER'],
        justification: 'File System Access API'
      });
      log('✅ Offscreen document created, waiting for ready signal...');

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Offscreen readiness timeout'));
        }, 5000);

        this._resolveOffscreenReady = () => {
          clearTimeout(timeout);
          this.offscreenReady = true;
          this._offscreenPromise = null;
          resolve();
        };
      });
    } catch (e) {
      if (e.message.includes('Only a single offscreen')) {
        log('✅ Offscreen already exists');
        this.offscreenReady = true;
        this._offscreenPromise = null;
        return;
      }

      log('💥 Offscreen creation error:', e.message);
      this._offscreenPromise = null;
      throw e;
    }
  }

  onOffscreenReady() {
    log('✅ Offscreen reports ready');
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
