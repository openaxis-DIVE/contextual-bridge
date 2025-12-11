// offscreen.js - Offscreen document handler for File System Access

const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[Kagi Saver Offscreen]', ...args);
}

export class OffscreenHandler {
  constructor() {
    this.dirHandle = null;
    this.init();
  }

  init() {
    log('🚀 Offscreen handler initializing');
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    // Notify background that we're ready to receive messages
    this.notifyReady();
  }

  handleMessage(msg, sender, sendResponse) {
    log('← Message:', msg.action || 'unknown');

    if (msg.action === 'saveFile') {
      this.saveFile(msg.filepath, msg.content)
        .then(sendResponse)
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true; // async
    }

    return false;
  }

  async saveFile(filepath, content) {
    log('💾 SAVE REQUEST:', filepath);
    try {
      const dir = await this.getDir();
      if (!dir) {
        return { success: false, error: 'No directory selected' };
      }

      const parts = filepath.replace(/\\\\/g, '/').split('/').filter(Boolean);
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

  notifyReady() {
    chrome.runtime.sendMessage({ action: 'OFFSCREEN_READY' });
  }
}
