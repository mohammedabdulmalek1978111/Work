console.log('Enhanced Autoscroll Background Service Worker');

// Store scrolling state for each tab
const scrollingTabs = new Map();
let globalScrollTimer = null;

// Default settings
const defaultSettings = {
  scrollDuration: 25,
  scrollPixels: 5,
  loop: false
};

// Start scrolling for a tab
function startScrollingForTab(tabId, settings) {
  console.log(`Starting scrolling for tab ${tabId}`, settings);
  
  scrollingTabs.set(tabId, {
    ...settings,
    active: true,
    lastScrollTime: Date.now()
  });
  
  // Start global timer if not already running
  if (!globalScrollTimer) {
    startGlobalScrollTimer();
  }
}

// Stop scrolling for a tab
function stopScrollingForTab(tabId) {
  console.log(`Stopping scrolling for tab ${tabId}`);
  scrollingTabs.delete(tabId);
  
  // Stop global timer if no tabs are scrolling
  if (scrollingTabs.size === 0 && globalScrollTimer) {
    clearInterval(globalScrollTimer);
    globalScrollTimer = null;
  }
}

// Global timer that manages scrolling for all tabs
function startGlobalScrollTimer() {
  // Use a faster interval and check individual tab timings
  globalScrollTimer = setInterval(() => {
    const now = Date.now();
    
    scrollingTabs.forEach((tabData, tabId) => {
      if (tabData.active && (now - tabData.lastScrollTime) >= tabData.scrollDuration) {
        // Send scroll command to this tab
        chrome.tabs.sendMessage(tabId, {
          type: 'SCROLL_STEP',
          pixels: tabData.scrollPixels,
          loop: tabData.loop
        }).catch((error) => {
          // Tab might be closed or not responding, remove it
          console.log(`Tab ${tabId} not responding, removing from scrolling list`);
          scrollingTabs.delete(tabId);
        });
        
        // Update last scroll time
        tabData.lastScrollTime = now;
      }
    });
    
    // Clean up if no tabs are scrolling
    if (scrollingTabs.size === 0) {
      clearInterval(globalScrollTimer);
      globalScrollTimer = null;
    }
  }, 10); // Run every 10ms for precise timing
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message, 'from sender:', sender);
  
  const tabId = sender.tab?.id;
  
  switch (message.type) {
    case 'START_SCROLLING':
      if (tabId) {
        startScrollingForTab(tabId, {
          scrollDuration: message.scrollDuration || defaultSettings.scrollDuration,
          scrollPixels: message.scrollPixels || defaultSettings.scrollPixels,
          loop: message.loop || defaultSettings.loop
        });
      }
      sendResponse({ success: true });
      break;
      
    case 'STOP_SCROLLING':
      if (tabId) {
        stopScrollingForTab(tabId);
      }
      sendResponse({ success: true });
      break;
      
    case 'TOGGLE_SCROLLING':
      if (tabId) {
        if (scrollingTabs.has(tabId)) {
          stopScrollingForTab(tabId);
        } else {
          // Get last used settings or defaults
          chrome.storage.sync.get(['defaultSettings'], (result) => {
            const settings = result.defaultSettings || defaultSettings;
            startScrollingForTab(tabId, settings);
          });
        }
      }
      sendResponse({ success: true });
      break;
      
    case 'GET_STATUS':
      if (tabId) {
        const isScrolling = scrollingTabs.has(tabId);
        sendResponse({ isScrolling, settings: scrollingTabs.get(tabId) });
      } else {
        sendResponse({ isScrolling: false });
      }
      break;
      
    case 'START_SCROLLING_FROM_POPUP':
      // Handle messages from popup (no sender.tab)
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          startScrollingForTab(tabs[0].id, {
            scrollDuration: message.scrollDuration || defaultSettings.scrollDuration,
            scrollPixels: message.scrollPixels || defaultSettings.scrollPixels,
            loop: message.loop || defaultSettings.loop
          });
        }
      });
      sendResponse({ success: true });
      break;
      
    case 'STOP_SCROLLING_FROM_POPUP':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          stopScrollingForTab(tabs[0].id);
        }
      });
      sendResponse({ success: true });
      break;
  }
  
  return true; // Keep message channel open for async response
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command, tab) => {
  console.log('Command received:', command, 'for tab:', tab);
  
  if (command === 'Toggle Autoscroll' && tab.id) {
    if (scrollingTabs.has(tab.id)) {
      stopScrollingForTab(tab.id);
    } else {
      // Get last used settings or defaults
      chrome.storage.sync.get(['defaultSettings'], (result) => {
        const settings = result.defaultSettings || defaultSettings;
        startScrollingForTab(tab.id, settings);
      });
    }
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (scrollingTabs.has(tabId)) {
    stopScrollingForTab(tabId);
  }
});

// Initialize
chrome.storage.sync.get(['defaultSettings'], (result) => {
  if (!result.defaultSettings) {
    chrome.storage.sync.set({ defaultSettings });
  }
});