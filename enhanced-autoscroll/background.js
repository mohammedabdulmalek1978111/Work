console.log('Enhanced Autoscroll Background Service Worker');

// Store scrolling state for each tab
const scrollingTabs = new Map();
let globalScrollTimer = null;
let heartbeatTimer = null;

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
    lastScrollTime: Date.now(),
    lastHeartbeat: Date.now(),
    usingLocalScrolling: false
  });
  
  // Start global timer if not already running
  if (!globalScrollTimer) {
    startGlobalScrollTimer();
  }
  
  // Start heartbeat monitoring if not already running
  if (!heartbeatTimer) {
    startHeartbeatMonitoring();
  }
}

// Stop scrolling for a tab
function stopScrollingForTab(tabId) {
  console.log(`Stopping scrolling for tab ${tabId}`);
  
  // Notify content script to stop local scrolling
  chrome.tabs.sendMessage(tabId, {
    type: 'STOP_LOCAL_SCROLLING'
  }).catch(() => {
    // Tab might be closed or not responding
  });
  
  scrollingTabs.delete(tabId);
  
  // Stop global timer if no tabs are scrolling
  if (scrollingTabs.size === 0) {
    if (globalScrollTimer) {
      clearInterval(globalScrollTimer);
      globalScrollTimer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }
}

// Global timer that manages scrolling for all tabs
function startGlobalScrollTimer() {
  // Use a faster interval and check individual tab timings
  globalScrollTimer = setInterval(() => {
    const now = Date.now();
    
    scrollingTabs.forEach((tabData, tabId) => {
      if (tabData.active && !tabData.usingLocalScrolling && (now - tabData.lastScrollTime) >= tabData.scrollDuration) {
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

// Heartbeat monitoring to detect throttling and fallback to local scrolling
function startHeartbeatMonitoring() {
  heartbeatTimer = setInterval(() => {
    const now = Date.now();
    
    scrollingTabs.forEach((tabData, tabId) => {
      if (tabData.active) {
        // Send heartbeat to check if content script is responsive
        chrome.tabs.sendMessage(tabId, {
          type: 'HEARTBEAT',
          timestamp: now
        }).then((response) => {
          tabData.lastHeartbeat = now;
          
          // If content script is using local scrolling but we're back online,
          // try to take over again
          if (response && response.localScrolling && !tabData.usingLocalScrolling) {
            console.log(`Tab ${tabId} is using local scrolling, attempting to take over`);
            // Let content script know we're back
            tabData.usingLocalScrolling = false;
          }
        }).catch(() => {
          // Content script not responding
          const timeSinceHeartbeat = now - tabData.lastHeartbeat;
          
          // If we haven't heard from content script in a while and we're not already
          // using local scrolling, tell it to take over
          if (timeSinceHeartbeat > 100 && !tabData.usingLocalScrolling) {
            console.log(`Tab ${tabId} background script may be throttled, switching to local scrolling`);
            
            chrome.tabs.sendMessage(tabId, {
              type: 'START_LOCAL_SCROLLING',
              settings: {
                scrollPixels: tabData.scrollPixels,
                scrollDuration: tabData.scrollDuration,
                loop: tabData.loop
              }
            }).catch(() => {
              // Content script might not be available
              console.log(`Cannot reach content script for tab ${tabId}`);
            });
            
            tabData.usingLocalScrolling = true;
          }
        });
      }
    });
  }, 50); // Check every 50ms
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
      
    case 'PING':
      // Content script is checking if we're alive
      if (tabId && scrollingTabs.has(tabId)) {
        const tabData = scrollingTabs.get(tabId);
        tabData.lastHeartbeat = Date.now();
        sendResponse({ success: true, timestamp: Date.now() });
      } else {
        sendResponse({ success: false });
      }
      break;
      
    case 'PAGE_VISIBLE':
      // Content script notifies that page is visible again
      if (tabId && scrollingTabs.has(tabId)) {
        const tabData = scrollingTabs.get(tabId);
        console.log(`Tab ${tabId} is visible again, taking over from local scrolling`);
        
        // Stop local scrolling and resume background scrolling
        chrome.tabs.sendMessage(tabId, {
          type: 'STOP_LOCAL_SCROLLING'
        }).catch(() => {
          // Ignore errors
        });
        
        tabData.usingLocalScrolling = false;
        tabData.lastHeartbeat = Date.now();
        tabData.lastScrollTime = Date.now();
      }
      sendResponse({ success: true });
      break;
      
    case 'CONTENT_SCRIPT_READY':
      // Content script is ready
      console.log(`Content script ready for tab ${tabId}`);
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

// Handle tab focus changes to optimize performance
chrome.tabs.onActivated.addListener((activeInfo) => {
  // When a tab becomes active, make sure it's not using local scrolling unnecessarily
  const tabId = activeInfo.tabId;
  if (scrollingTabs.has(tabId)) {
    const tabData = scrollingTabs.get(tabId);
    if (tabData.usingLocalScrolling) {
      // Try to take over from local scrolling since tab is now active
      chrome.tabs.sendMessage(tabId, {
        type: 'STOP_LOCAL_SCROLLING'
      }).then(() => {
        tabData.usingLocalScrolling = false;
        tabData.lastHeartbeat = Date.now();
      }).catch(() => {
        // Content script might not be ready
      });
    }
  }
});

// Initialize
chrome.storage.sync.get(['defaultSettings'], (result) => {
  if (!result.defaultSettings) {
    chrome.storage.sync.set({ defaultSettings });
  }
});