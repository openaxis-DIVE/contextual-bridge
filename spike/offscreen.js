// offscreen.js
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[Kagi Saver Offscreen]', ...args);
}

let dirHandle = null;

async function pickDir() {
  log('🔥 SHOWING PICKER');
  try {
    dirHandle = await window.showDirectoryPicker({ 
      mode: 'readwrite', 
      startIn: 'downloads' 
    });
    log('📁 Directory cached:', dirHandle.name);
    return dirHandle;
  } catch (e) {
    log('❌ Picker cancelled:', e.name);
    return null;
  }
}

async function getDir() {
  if (dirHandle) {
    try {
      await dirHandle.queryPermission({ mode: 'readwrite' });
      return dirHandle;
    } catch {
      log('📁 Cache stale - repicking');
      return await pickDir();
    }
  }
  return await pickDir();
}

async function saveFile(path, content) {
  log('💾 SAVE', path);
  
  const dir = await getDir();
  if (!dir) return { success: false, error: 'No directory selected' };
  
  try {
    const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
    const name = parts.pop();
    let cwd = dir;
    
    for (let part of parts) {
      cwd = await cwd.getDirectoryHandle(part, { create: true });
    }
    
    const handle = await cwd.getFileHandle(name, { create: true });
    const write = await handle.createWritable();
    await write.write(content);
    await write.close();
    
    log('✅ SAVED', path);
    return { success: true };
  } catch (e) {
    log('💥 ERROR', e.message);
    return { success: false, error: e.message };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  log('←', msg.action || msg.ping ? 'PING' : 'UNKNOWN');
  
  if (msg.ping) {
    sendResponse({ pong: true });
    return;
  }
  
  if (msg.action === 'saveFile') {
    saveFile(msg.filepath, msg.content).then(sendResponse);
    return true;
  }
});
