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
    this.showBanner('🔖 Bridge ready: Press Ctrl+B to open', 'info');
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
   */
  onOpenModal() {
    this.log('OPEN_MODAL triggered');
    this.listeningMode = true;

    this.dispatchToBackground('OPEN_MODAL', {})
      .catch((err) => {
        this.showBannerError('Failed to open modal');
        this.log('OPEN_MODAL error:', err);
      });

    // Show available actions
    this.showBanner('Bridge Mode: [S]ave | [L]oad | [D]irectory | [Esc]ape', 'info');
  }

  /**
   * Escape or close button pressed - exit listening mode
   */
  onCloseModal() {
    this.log('CLOSE_MODAL triggered');
    this.listeningMode = false;

    this.dispatchToBackground('CLOSE_MODAL', {})
      .catch((err) => {
        this.log('CLOSE_MODAL error:', err);
      });

    this.showBanner('Bridge mode closed', 'info');
  }

  /**
   * S pressed (in listening mode) - save clipboard to file
   */
  onSave() {
    this.log('SAVE triggered');

    // Get clipboard content
    navigator.clipboard
      .readText()
      .then((content) => {
        if (!content || content.trim().length === 0) {
          this.showBannerError('Clipboard is empty');
          return;
        }

        this.log('Read clipboard:', {
          length: content.length,
          preview: content.substring(0, 50),
        });

        this.dispatchToBackground('SAVE_FILE', {
          content,
          timestamp: Date.now(),
        });
      })
      .catch((err) => {
        this.showBannerError('Failed to read clipboard');
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
    });
  }

  /**
   * D pressed (in listening mode) - pick working directory
   */
  onPickDirectory() {
    this.log('PICK_DIRECTORY triggered');

    this.dispatchToBackground('PICK_DIRECTORY', {
      timestamp: Date.now(),
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
   * Show info/success banner message
   * Delegates to BannerManager if available
   * @private
   */
  showBanner(message, type = 'info') {
    if (window.BannerManager) {
      window.BannerManager.show(message, type);
    } else {
      this.log(`[Banner-${type}] ${message}`);
    }
  }

  /**
   * Show error banner message
   * @private
   */
  showBannerError(message) {
    this.showBanner(message, 'error');
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
