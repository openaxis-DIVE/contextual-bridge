// content.js - Content script for clipboard monitoring

import { BannerManager } from './bannerManager.js';

const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[Kagi Saver Content]', ...args);
}

const bannerManager = new BannerManager();

class FileMarkerParser {
  constructor() {
    this.patterns = [
      { name: 'json', regex: /\{\s*"\$file"\s*:\s*"([^"]+)"/ },
      { name: 'comment', regex: /^[\s\/\*\#\[\<\-'"`]*\s*(.+?)\s*$/ }
    ];
  }

  parse(text) {
    if (!text || text.length === 0) return null;

    const firstLine = text.trimStart().split('\n')[0];
    const filepath = this.extractPath(firstLine);

    if (!filepath || !this.isValidPath(filepath)) {
      log('❌ Invalid path:', filepath);
      return null;
    }

    const content = text.split('\n').slice(1).join('\n').trim();
    if (!content) {
      log('❌ No content after marker');
      return null;
    }

    log('✅ Parsed:', filepath);
    return { filepath, content };
  }

  extractPath(line) {
    for (const pattern of this.patterns) {
      const match = line.match(pattern.regex);
      if (match?.[1]) {
        return match[1];
      }
    }
    return null;
  }

  isValidPath(path) {
    return /\.\w+$|[\/\\]/.test(path);
  }
}

class ClipboardWatcher {
  constructor() {
    this.lastClipboard = '';
    this.parser = new FileMarkerParser();
    this.init();
  }

  init() {
    log('🚀 Clipboard watcher initializing');
    document.addEventListener('copy', this.onCopy.bind(this));
    document.addEventListener('click', this.onClick.bind(this));
    bannerManager.show('🔖 Kagi Saver active', 3000);
  }

  onCopy() {
    setTimeout(this.checkClipboard.bind(this, 'copy'), 100);
  }

  onClick() {
    setTimeout(this.checkClipboard.bind(this, 'click'), 500);
  }

  async checkClipboard(source) {
    try {
      const text = await navigator.clipboard.readText();

      if (text === this.lastClipboard || text.length === 0) {
        return;
      }

      log(`--- Clipboard changed (${source}) ---`);
      this.lastClipboard = text;

      const parsed = this.parser.parse(text);
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

// Initialize when DOM is ready
if (document.body) {
  new ClipboardWatcher();
} else {
  document.addEventListener('DOMContentLoaded', () => new ClipboardWatcher());
}
