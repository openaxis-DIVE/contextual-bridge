class BannerManager {
  constructor() {
    this.currentBanner = null;
  }

  show(msg, duration = 8000) {
    // Remove existing banner
    if (this.currentBanner) {
      this.currentBanner.remove();
    }
    
    // Create new one
    const container = document.createElement('div');
    const shadow = container.attachShadow({ mode: 'closed' });
    // ... banner HTML
    
    document.body.appendChild(container);
    this.currentBanner = container;
    
    setTimeout(() => {
      container.remove();
      this.currentBanner = null;
    }, duration);
  }
}

const bannerManager = new BannerManager();
