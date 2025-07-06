console.log('Enhanced Autoscroll Content Script Loaded');

// Special handling for Google Docs
const element = window.location.origin === 'https://docs.google.com'
  ? document.querySelector('.kix-appview-editor')
  : null;

let isLooping = false;
let localScrolling = false;
let localScrollTimer = null;
let localScrollSettings = null;
let lastHeartbeat = Date.now();
let heartbeatTimer = null;

// Calculate scroll percentage
function getScrollPercentage(element) {
  const scrollTop = element.scrollTop;
  const scrollHeight = element.scrollHeight;
  const clientHeight = element.clientHeight;
  const scrollDistance = scrollHeight - clientHeight;
  const scrollPercentage = scrollTop / scrollDistance;
  return scrollPercentage;
}

// Perform scrolling on an element
function scrollElement(mainElement, amount, loop = false) {
  const percentage = getScrollPercentage(mainElement);
  const isDone = percentage > 0.99;
  const scrollTop = mainElement.scrollTop;
  
  if (isLooping) {
    if (percentage < 0.01) {
      isLooping = false;
    }
  } else {
    mainElement.scroll(0, scrollTop + amount);
  }
  
  const delta = mainElement.scrollTop - scrollTop;
  
  if (isDone && loop) {
    // Handle looping - scroll back to top
    isLooping = true;
    mainElement.scroll({
      top: 0,
      behavior: 'auto',
    });
  }
  
  return delta;
}

// Local scrolling function that works independently
function performLocalScroll() {
  if (!localScrolling || !localScrollSettings) return;
  
  const elements = [element, document?.body, document?.body?.parentNode].filter(Boolean);
  
  for (let elem of elements) {
    const delta = scrollElement(elem, localScrollSettings.scrollPixels, localScrollSettings.loop);
    if (delta) break; // Stop after first successful scroll
  }
}

// Start local scrolling timer
function startLocalScrolling(settings) {
  console.log('Starting local scrolling with settings:', settings);
  localScrolling = true;
  localScrollSettings = settings;
  
  if (localScrollTimer) {
    clearInterval(localScrollTimer);
  }
  
  localScrollTimer = setInterval(performLocalScroll, settings.scrollDuration);
}

// Stop local scrolling timer
function stopLocalScrolling() {
  console.log('Stopping local scrolling');
  localScrolling = false;
  localScrollSettings = null;
  
  if (localScrollTimer) {
    clearInterval(localScrollTimer);
    localScrollTimer = null;
  }
}

// Heartbeat system to detect when background script is throttled
function startHeartbeatMonitoring() {
  heartbeatTimer = setInterval(() => {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - lastHeartbeat;
    
    // If we haven't received a heartbeat in over 100ms and we should be scrolling,
    // start local scrolling as backup
    if (timeSinceLastHeartbeat > 100 && localScrollSettings && !localScrolling) {
      console.log('Background script appears throttled, starting local backup scrolling');
      localScrolling = true;
      if (!localScrollTimer) {
        localScrollTimer = setInterval(performLocalScroll, localScrollSettings.scrollDuration);
      }
    }
    
    // Send ping to background script to maintain connection
    chrome.runtime.sendMessage({
      type: 'PING',
      timestamp: now
    }).catch(() => {
      // Background script might be throttled or unavailable
      if (localScrollSettings && !localScrolling) {
        console.log('Cannot reach background script, enabling local scrolling');
        startLocalScrolling(localScrollSettings);
      }
    });
  }, 50); // Check every 50ms
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  // Update heartbeat on any message
  lastHeartbeat = Date.now();
  
  switch (message.type) {
    case 'SCROLL_STEP':
      // Update settings for potential local fallback
      localScrollSettings = {
        scrollPixels: message.pixels,
        scrollDuration: 25, // Default duration
        loop: message.loop
      };
      
      // Stop local scrolling since background is working
      if (localScrolling) {
        stopLocalScrolling();
      }
      
      // Perform a single scroll step
      const elements = [element, document?.body, document?.body?.parentNode].filter(Boolean);
      
      for (let elem of elements) {
        const delta = scrollElement(elem, message.pixels, message.loop);
        if (delta) break; // Stop after first successful scroll
      }
      
      sendResponse({ success: true });
      break;
      
    case 'START_LOCAL_SCROLLING':
      // Background script is asking us to take over scrolling
      startLocalScrolling(message.settings);
      sendResponse({ success: true });
      break;
      
    case 'STOP_LOCAL_SCROLLING':
      stopLocalScrolling();
      localScrollSettings = null;
      sendResponse({ success: true });
      break;
      
    case 'RESET_LOOP':
      isLooping = false;
      sendResponse({ success: true });
      break;
      
    case 'HEARTBEAT':
      // Background script is alive
      lastHeartbeat = Date.now();
      sendResponse({ success: true, localScrolling });
      break;
      
    case 'GET_PAGE_INFO':
      // Return information about the page
      const mainElem = element || document.body || document.documentElement;
      const pageInfo = {
        scrollTop: mainElem.scrollTop,
        scrollHeight: mainElem.scrollHeight,
        clientHeight: mainElem.clientHeight,
        percentage: getScrollPercentage(mainElem),
        url: window.location.href,
        title: document.title,
        localScrolling: localScrolling
      };
      sendResponse(pageInfo);
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return true; // Keep message channel open for async response
});

// Notify background script that content script is ready
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_READY',
  url: window.location.href,
  title: document.title
}).catch((error) => {
  console.log('Failed to notify background script:', error);
});

// Handle page visibility changes to maintain scrolling state
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('Page is now hidden, but scrolling should continue');
    // When page becomes hidden, prepare for potential background throttling
    if (localScrollSettings && !localScrolling) {
      // Start local scrolling as backup immediately
      startLocalScrolling(localScrollSettings);
    }
  } else {
    console.log('Page is now visible');
    // When page becomes visible again, let background script take over
    if (localScrolling) {
      stopLocalScrolling();
      // Notify background script that we're visible again
      chrome.runtime.sendMessage({
        type: 'PAGE_VISIBLE',
        settings: localScrollSettings
      }).catch(() => {
        // If background script is not responding, keep local scrolling
        startLocalScrolling(localScrollSettings);
      });
    }
  }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  stopLocalScrolling();
  chrome.runtime.sendMessage({
    type: 'STOP_SCROLLING'
  }).catch(() => {
    // Ignore errors during page unload
  });
});

// Start heartbeat monitoring
startHeartbeatMonitoring();