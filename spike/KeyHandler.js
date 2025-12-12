// spike/KeyHandler.js
// Keyboard event handler with message dispatch to background

/**
 * KeyHandler - Centralize keyboard event capture, validation, and dispatch
 *
 * Responsible for:
 * - Capturing keyboard events (focused document only)
 * - Validating against configurable keymap
 * - Dispatching validated messages to background
 * - Showing banner feedback via BannerManager
 *
 * Does NOT handle:
 * - Business logic (that's background.js)
 * - File operations (that's background.js / offscreen.js)
 * - UI rendering (that's modal/banner components)
 */
class KeyHandler {
  /**
   * Constructor
   * @param {Object} config - Configuration object
   * @param {Boolean} config.debug - Enable console logging (default: false)
   * @param {Boolean} config.focusOnly - Only listen when document focused (default: true)
   */
  constructor(config = {}) {
    this.debug = config.debug || false;
    this.focusOnly = config.focusOnly !== false;
    this.isInitialized = false;
    this.windowFocused = true;
    this.listeningMode = false; // Track if we're listening for S/L/D/Escape
    this.currentDirName = null; // Track current directory name for banner display

    // Bind all handlers so they can be removed later
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  /**
   * Initialize keyboard listeners
   * Attaches event listeners to document/window
   */
  init() {
    if (this.isInitialized) {
      console.warn('[KeyHandler] Already initialized, skipping init()');
      return;
    }

    // ALWAYS attach keydown to document - this is what fires Ctrl+B
    document.addEventListener('keydown', this.onKeyDown);
    this.log('✅ Keydown listener attached to document');

    // Also attach focus/blur if focusOnly is enabled
    if (this.focusOnly) {
      window.addEventListener('focus', this.onFocus);
      window.addEventListener('blur', this.onBlur);
      // Check current window focus state
      this.windowFocused = document.hasFocus();
      this.log(`✅ Focus/blur listeners attached (window focused: ${this.windowFocused})`);
    }

    this.isInitialized = true;
    this.log('KeyHandler initialized', {
      focusOnly: this.focusOnly,
      windowFocused: this.windowFocused,
    });

    // Show banner to user - let them know we're listening and what keys to use
    this.showBanner('🔖 Bridge ready: Press Ctrl+B to open');
  }

  /**
   * Cleanup - remove event listeners
   */
  destroy() {
    if (!this.isInitialized) return;

    document.removeEventListener('keydown', this.onKeyDown);
    if (this.focusOnly) {
      window.removeEventListener('focus', this.onFocus);
      window.removeEventListener('blur', this.onBlur);
    }

    this.isInitialized = false;
    this.log('KeyHandler destroyed');
  }

  /**
   * Window focus handler
   * @private
   */
  onFocus = (event) => {
    this.windowFocused = true;
    this.log('🔵 Window gained focus');
  };

  /**
   * Window blur handler
   * @private
   */
  onBlur = (event) => {
    this.windowFocused = false;
    this.log('⚪ Window lost focus');
  };

  /**
   * Main keydown handler
   * @private
   */
  onKeyDown = (event) => {
    // Check if window is focused (if focusOnly enabled)
    if (this.focusOnly && !this.windowFocused) {
      return;
    }

    // Don't intercept if listening mode is off and event is from input/textarea
    if (!this.listeningMode && this.isFormElement(event.target)) {
      return;
    }

    const validation = this.validateKeyboardEvent(event);
    if (!validation.isValid) {
      return;
    }

    // Prevent default so Ctrl+B doesn't trigger browser shortcuts
    event.preventDefault();

    const action = validation.action;
    this.log(`Key event validated: ${action}`, {
      ctrlKey: event.ctrlKey,
      key: event.key,
    });

    this.handleAction(action);
  };

  /**
   * Validate keyboard event
   * Returns object with { action, isValid }
   * @private
   */
  validateKeyboardEvent(event) {
    // Simple check: is this Ctrl+B?
    if (event.ctrlKey && event.key.toLowerCase() === 'b') {
      return {
        isValid: true,
        action: 'OPEN_MODAL',
      };
    }

    // Check if listening mode is on - handle S/L/D/Escape
    if (this.listeningMode) {
      const key = event.key.toLowerCase();
      if (key === 's') return { isValid: true, action: 'SAVE' };
      if (key === 'l') return { isValid: true, action: 'LOAD' };
      if (key === 'd') return { isValid: true, action: 'PICK_DIRECTORY' };
      if (event.key === 'Escape') return { isValid: true, action: 'CLOSE_MODAL' };
    }

    return { isValid: false };
  }

  /**
   * Check if event target is a form element
   * @private
   */
  isFormElement(target) {
    const formTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    if (formTags.includes(target.tagName)) {
      return true;
    }
    // Also check contenteditable
    if (target.contentEditable === 'true') {
      return true;
    }
    return false;
  }

  /**
   * Handle validated action
   * Routes to appropriate method
   * @private
   */
  handleAction(action) {
    switch (action) {
      case 'OPEN_MODAL':
        this.onOpenModal();
        break;
      case 'CLOSE_MODAL':
        this.onCloseModal();
        break;
      case 'SAVE':
        this.onSave();
        break;
      case 'LOAD':
        this.onLoad();
        break;
      case 'PICK_DIRECTORY':
        this.onPickDirectory();
        break;
      default:
        this.log(`Unknown action: ${action}`);
    }
  }

  /**
   * Ctrl+B pressed - enter listening mode
   * NOW IMPLEMENTED: Handles response from background
   */
  onOpenModal() {
    this.log('OPEN_MODAL triggered');

    this.dispatchToBackground('OPEN_MODAL', {})
      .then((response) => {
        if (response.success && response.dirName) {
          // Success: directory selected
          this.listeningMode = true;
          this.currentDirName = response.dirName;
          this.showBanner(`Bridge: 📁 ${response.dirName} | [S]ave | [L]oad | [D]irectory | [Esc]ape`);
          this.log('✅ Bridge mode active:', response.dirName);
        } else if (response.cancelled) {
          // User cancelled the picker
          this.listeningMode = false;
          this.currentDirName = null;
          this.showBanner('Bridge cancelled (no directory selected)');
          this.log('⚠️ Directory picker cancelled');
        } else {
          // Error occurred
          this.listeningMode = false;
          this.currentDirName = null;
          const errorMsg = response.error || 'Unknown error';
          this.showBanner(`Bridge error: ${errorMsg}`);
          this.log('❌ Bridge error:', errorMsg);
        }
      })
      .catch((err) => {
        this.listeningMode = false;
        this.currentDirName = null;
        this.showBanner('Failed to open bridge');
        this.log('OPEN_MODAL error:', err);
      });
  }

  /**
   * Escape or close button pressed - exit listening mode
   */
  onCloseModal() {
    this.log('CLOSE_MODAL triggered');
    this.listeningMode = false;
    this.currentDirName = null;

    this.dispatchToBackground('CLOSE_MODAL', {})
      .catch((err) => {
        this.log('CLOSE_MODAL error:', err);
      });

    this.showBanner('Bridge mode closed');
  }

  /**
   * S pressed (in listening mode) - save clipboard to file
   * NOW IMPLEMENTED: Handles response from background
   */
  onSave() {
    this.log('SAVE triggered');

    // Get clipboard content
    navigator.clipboard
      .readText()
      .then((content) => {
        if (!content || content.trim().length === 0) {
          this.showBanner('Clipboard is empty');
          return;
        }

        this.log('Read clipboard:', {
          length: content.length,
          preview: content.substring(0, 50),
        });

        // Send to background and handle response
        this.dispatchToBackground('SAVE_FILE', {
          content,
          timestamp: Date.now(),
        })
          .then((response) => {
            if (response.success) {
              // Success: show filename if available
              const filename = response.filepath ? response.filepath.split(/[\/\\]/).pop() : 'file';
              this.showBanner(`✅ Saved: ${filename}`);
              this.log('✅ File saved successfully:', response.filepath);
            } else if (response.cancelled) {
              // User cancelled directory picker during save
              this.showBanner('Save cancelled');
              this.log('⚠️ Save cancelled by user');
            } else {
              // Error occurred
              const errorMsg = response.error || 'Unknown error';
              this.showBanner(`❌ Save failed: ${errorMsg}`);
              this.log('❌ Save error:', errorMsg);
            }
          })
          .catch((err) => {
            this.showBanner('❌ Save failed: Communication error');
            this.log('Save dispatch error:', err);
          });
      })
      .catch((err) => {
        this.showBanner('Failed to read clipboard');
        this.log('Clipboard read error:', err);
      });
  }

  /**
   * L pressed (in listening mode) - load file and copy to clipboard
   */
  onLoad() {
    this.log('LOAD triggered');

    // Check if user has text selected (could be a filepath hint)
    const selection = window.getSelection().toString().trim();

    this.dispatchToBackground('LOAD_FILE', {
      selectedText: selection || null,
      timestamp: Date.now(),
    })
      .then((response) => {
        if (response.success) {
          this.showBanner('✅ Loaded to clipboard');
          this.log('✅ File loaded successfully');
        } else {
          const errorMsg = response.error || 'Unknown error';
          this.showBanner(`❌ Load failed: ${errorMsg}`);
          this.log('❌ Load error:', errorMsg);
        }
      })
      .catch((err) => {
        this.showBanner('❌ Load failed');
        this.log('Load dispatch error:', err);
      });
  }

  /**
   * D pressed (in listening mode) - pick working directory
   * NOW IMPLEMENTED: Handles response from background
   */
  onPickDirectory() {
    this.log('PICK_DIRECTORY triggered');

    this.dispatchToBackground('PICK_DIRECTORY', {
      timestamp: Date.now(),
    })
      .then((response) => {
        if (response.success && response.dirName) {
          // Success: update directory and keep listening mode active
          this.currentDirName = response.dirName;
          this.showBanner(`Bridge: 📁 ${response.dirName} | [S]ave | [L]oad | [D]irectory | [Esc]ape`);
          this.log('✅ Directory changed:', response.dirName);
        } else if (response.cancelled) {
          // User cancelled - keep listening mode as-is
          this.showBanner('Directory change cancelled');
          this.log('⚠️ Directory picker cancelled');
        } else {
          // Error occurred - keep listening mode as-is
          const errorMsg = response.error || 'Unknown error';
          this.showBanner(`Directory change failed: ${errorMsg}`);
          this.log('❌ Directory picker error:', errorMsg);
        }
      })
      .catch((err) => {
        this.showBanner('Failed to pick directory');
        this.log('PICK_DIRECTORY error:', err);
      });
  }

  /**
   * Send message to background with standard format
   * @private
   * @returns {Promise} - Resolves with response from background
   */
  async dispatchToBackground(action, payload) {
    const message = {
      action,
      payload,
      timestamp: Date.now(),
    };

    this.log('Dispatch to background:', { action, payload });

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          this.log(`Background error (${action}):`, chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        this.log(`Background response (${action}):`, response);
        resolve(response);
      });
    });
  }

  /**
   * Show banner message
   * Delegates to BannerManager if available
   * @param {string} message - Message to display
   * @private
   */
  showBanner(message) {
    if (window.BannerManager) {
      window.BannerManager.show(message, 5000);
    } else {
      this.log(`[Banner] ${message}`);
    }
  }

  /**
   * Debug logging
   * Only logs if debug flag is true
   * @private
   */
  log(...args) {
    if (this.debug) {
      console.log('[KeyHandler]', ...args);
    }
  }

  /**
   * Get current state (useful for testing)
   */
  getModalState() {
    return {
      listeningMode: this.listeningMode,
      initialized: this.isInitialized,
      currentDirName: this.currentDirName,
    };
  }

  /**
   * Force set listening mode (useful for testing)
   */
  setModalState(isListening) {
    this.listeningMode = isListening;
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeyHandler;
}
