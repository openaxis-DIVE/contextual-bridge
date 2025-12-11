class ClipboardWatcher {
  constructor() {
    this.lastClipboard = '';
    this.parser = new FileMarkerParser();
    this.init();
  }

  init() {
    document.addEventListener('copy', this.onCopy.bind(this));
    document.addEventListener('click', this.onClick.bind(this));
  }

  onCopy() {
    setTimeout(this.checkClipboard.bind(this, 'copy'), 100);
  }

  async checkClipboard(source) {
    const text = await navigator.clipboard.readText();
    if (text === this.lastClipboard) return;
    
    this.lastClipboard = text;
    const parsed = this.parser.parse(text);
    
    if (parsed) {
      this.saveViaBackground(parsed);
    }
  }

  saveViaBackground(parsed) {
    chrome.runtime.sendMessage(
      { action: 'saveFile', ...parsed },
      this.onSaveResponse.bind(this, parsed)
    );
  }

  onSaveResponse(parsed, response) {
    if (response?.success) {
      showBanner(`✅ Saved: ${parsed.filename}`);
    } else {
      showBanner(`❌ Failed`);
    }
  }
}

class FileMarkerParser {
  parse(text) {
    const firstLine = text.trimStart().split('\n')[0];
    const filepath = this.extractPath(firstLine);
    
    if (!filepath || !this.isValidPath(filepath)) return null;
    
    const content = text.split('\n').slice(1).join('\n').trim();
    return content ? { filepath, content } : null;
  }

  extractPath(line) {
    const jsonMatch = line.match(/\{\s*"\$file"\s*:\s*"([^"]+)"/);
    if (jsonMatch) return jsonMatch[1];
    
    const commentMatch = line.match(/^[\s\/\*\#\[\<\-'"\`]*\s*(.+?)\s*$/);
    return commentMatch?.[1];
  }

  isValidPath(path) {
    return path.includes('.') || path.includes('/') || path.includes('\\');
  }
}

new ClipboardWatcher();
