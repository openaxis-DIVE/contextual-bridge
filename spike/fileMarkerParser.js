// fileMarkerParser.js

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
      return null;
    }

    const content = text.split('\n').slice(1).join('\n').trim();
    if (!content) {
      return null;
    }

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

// Export for use in background.js (service worker context)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileMarkerParser;
}
