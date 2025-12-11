// bannerManager.js

export class BannerManager {
  constructor() {
    this.currentBanner = null;
  }

  show(msg, duration = 4000) {
    // Remove existing banner
    if (this.currentBanner) {
      this.currentBanner.remove();
    }

    const container = document.createElement('div');
    const shadow = container.attachShadow({ mode: 'closed' });

    // Create style element
    const style = document.createElement('style');
    style.textContent = `
      :host {
        --banner-bg: #333;
        --banner-text: #fff;
      }
      div {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--banner-bg);
        color: var(--banner-text);
        padding: 12px 16px;
        border-radius: 6px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out, slideOut 0.3s ease-in ${duration - 300}ms forwards;
      }
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;

    // Create message div
    const messageDiv = document.createElement('div');
    messageDiv.textContent = msg;

    // Append to shadow DOM
    shadow.appendChild(style);
    shadow.appendChild(messageDiv);

    // Append to page
    document.body.appendChild(container);
    this.currentBanner = container;

    // Remove after duration
    setTimeout(() => {
      container.remove();
      this.currentBanner = null;
    }, duration);
  }
}
