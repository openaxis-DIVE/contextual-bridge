// ============================================================================
// FileMarkerParser - Inlined for service worker compatibility
// ============================================================================

class FileMarkerParser {
  constructor() {
    this.patterns = [
      // JSON format: { "$file": "path/to/file.js" }
      { name: 'json', regex: /\{\s*"\$file"\s*:\s*"([^"]+)"/ },
      // Comment format: // path/to/file.js or # path/to/file.js etc.
      { name: 'comment', regex: /^[\s\/\*\#\[\<\-'"`]*\s*([^\s]+(?:\s+[^\s]+)*?)(?:\s*[-\/#\*]|\s*$)/ }
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
        // Clean up captured filepath - trim and remove trailing comment markers
        const path = match[1].trim().replace(/[\s\-\/#\*]+$/, '');
        return path;
      }
    }
    return null;
  }

  isValidPath(path) {
    return /\.\w+$|[\/\\]/.test(path);
  }
}

log('✅ FileMarkerParser loaded (inlined)');
