(function() {
  'use strict';
  
  const DEBUG = true;
  let lastClipboard = '';
  
  function log(...args) {
    if (DEBUG) console.log('[Kagi Saver]', ...args);
  }
  
  function showBanner(msg, duration = 8000) {
    const container = document.createElement('div');
    const shadow = container.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        .banner {
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
          background: #2d2d2d; color: #fff; padding: 12px 24px;
          border-radius: 6px; z-index: 999999;
          font-family: system-ui; font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          animation: fadeInOut 8s forwards;
        }
        @keyframes fadeInOut {
          0%, 85% { opacity: 1; }
          100% { opacity: 0; }
        }
      </style>
      <div class="banner">${msg}</div>
    `;
    document.body.appendChild(container);
    setTimeout(() => container.remove(), duration);
  }
  
  async function parseClipboard(text) {
    log('🔥 PARSE INPUT:', text.split('\n')[0]);
    
    const firstLine = text.trimStart().split('\n')[0];
    if (!firstLine) return null;
    
    log('🔥 FIRST LINE AFTER TRIM:', firstLine);
    
    let filepath;
    
    const jsonMatch = firstLine.match(/\{\s*"\$file"\s*:\s*"([^"]+)"/);
    if (jsonMatch) {
      filepath = jsonMatch[1];
    } else {
      const match = firstLine.match(/^[\s\/\*\#\[\<\-'"`]*\s*(.+?)\s*$/);
      if (!match) {
        log('🔥 NO REGEX MATCH');
        return null;
      }
      filepath = match[1];
    }
    
    filepath = filepath.trim();
    log('🔥 EXTRACTED PATH:', filepath);
    
    if (!filepath.includes('.') && !filepath.includes('/') && !filepath.includes('\\')) {
      log('🔥 INVALID PATH - no . / \\');
      return null;
    }
    
    const content = text.split('\n').slice(1).join('\n').trim();
    if (!content) {
      log('🔥 NO CONTENT');
      return null;
    }
    
    log('✅ PARSED SUCCESS');
    return { filepath, content };
  }
  
  async function checkClipboard(source) {
    try {
      const text = await navigator.clipboard.readText();
      
      if (text !== lastClipboard && text.length > 0) {
        log(`--- CLIPBOARD CHANGED (${source}) ---`);
        log(text);
        log('--- END CLIPBOARD ---');
        
        lastClipboard = text;
        
        const parsed = await parseClipboard(text);
        if (parsed) {
          log('Parsed file save request:', parsed.filepath);
          showBanner(`📋 Detected: ${parsed.filepath.split(/[/\\]/).pop()}`);
          
          chrome.runtime.sendMessage({
            action: 'saveFile',
            filepath: parsed.filepath,
            content: parsed.content
          }, (response) => {
            if (chrome.runtime.lastError) {
              log('❌ Runtime error:', chrome.runtime.lastError.message);
              showBanner(`❌ Extension error`);
              return;
            }
            
            if (response?.success) {
              showBanner(`✅ Saved: ${parsed.filepath.split(/[/\\]/).pop()}`);
            } else {
              log('❌ Save failed:', response?.error);
              showBanner(`❌ Save failed`);
            }
          });
        }
      }
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        log('Clipboard error:', err.message);
      }
    }
  }
  
  function init() {
    log('Initializing...');
    
    document.addEventListener('copy', () => {
      setTimeout(() => checkClipboard('copy event'), 100);
    });
    
    document.addEventListener('click', () => {
      setTimeout(() => checkClipboard('click'), 500);
    });
    
    showBanner('Kagi Saver active');
  }
  
  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
