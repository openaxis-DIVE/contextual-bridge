// offscreen.js - Offscreen document handler for File System Access

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
    const message = `[${timestamp}] [Kagi Saver Offscreen] ${args.join(' ')}`;
    console.log(message);

    // Relay to background, which will relay to content
    chrome.runtime.sendMessage({
      action: 'LOG_RELAY_FROM_OFFSCREEN',
      payload: { args }
    }).catch(() => {});
  }
}

log('📄 offscreen.js loaded');

class OffscreenHandler {
  constructor() {
    this.dirHandle = null;
    this.init();
  }

  init() {
    log('🚀 Offscreen handler initializing');
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    this.notifyReady();
  }

  handleMessage(msg, sender, sendResponse) {
    log('← Message:', msg.action || 'unknown');

    switch (msg.action) {
      case 'saveFile': {
        // Legacy path: expects { filepath, content }
        this.saveFile(msg.filepath, msg.content)
          .then(sendResponse)
          .catch(e => sendResponse({ success: false, error: e.message }));
        return true; // async
      }

      case 'ENSURE_DIRECTORY': {
        this.ensureDirectory()
          .then(sendResponse)
          .catch(e => sendResponse({ success: false, error: e.message }));
        return true; // async
      }

      default:
        return false;
    }
  }

  async ensureDirectory() {
    const dir = await this.getDir();
    if (!dir) {
      // User cancelled or no directory available
      return { success: false, cancelled: true };
    }
    return {
      success: true,
      dirName: dir.name
    };
  }

  async saveFile(filepath, content) {
    log('💾 SAVE REQUEST:', filepath);
    try {
      const dir = await this.getDir();
      if (!dir) {
        return { success: false, error: 'No directory selected' };
      }

      const parts = filepath.replace(/\\/g, '/').split('/').filter(Boolean);
      const filename = parts.pop();
      let cwd = dir;

      for (const part of parts) {
        cwd = await cwd.getDirectoryHandle(part, { create: true });
      }

      const fileHandle = await cwd.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      log('✅ SAVED:', filepath);
      return { success: true };
    } catch (e) {
      log('💥 Save error:', e.message);
      return { success: false, error: e.message };
    }
  }

  async getDir() {
    if (this.dirHandle) {
      try {
        await this.dirHandle.queryPermission({ mode: 'readwrite' });
        log('📁 Using cached directory');
        return this.dirHandle;
      } catch (e) {
        log('📁 Cache stale, repicking');
        this.dirHandle = null;
      }
    }

    return await this.pickDir();
  }

  async pickDir() {
    log('🔥 SHOWING PICKER');
    try {
      this.dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'downloads'
      });
      log('📁 Directory selected:', this.dirHandle.name);
      return this.dirHandle;
    } catch (e) {
      log('❌ Picker cancelled or error:', e.name);
      return null;
    }
  }

  async notifyReady() {
    const maxRetries = 5;
    const retryDelay = 100;
    for (let i = 0; i < maxRetries; i++) {
      try {
        log(`📢 Sending OFFSCREEN_READY (attempt ${i + 1}/${maxRetries})`);
        await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ action: 'OFFSCREEN_READY' }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
        log('✅ OFFSCREEN_READY sent successfully');
        return;
      } catch (e) {
        if (i < maxRetries - 1) {
          log(`⏳ Retry ${i + 1}/${maxRetries} after ${retryDelay}ms...`, e.message);
          await new Promise(r => setTimeout(r, retryDelay));
        } else {
          log('💥 Failed to send OFFSCREEN_READY after retries:', e.message);
        }
      }
    }
  }
}

new OffscreenHandler();
