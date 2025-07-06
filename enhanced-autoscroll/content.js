console.log('Enhanced Autoscroll Content Script Loaded');

// Special handling for Google Docs
const element = window.location.origin === 'https://docs.google.com'
  ? document.querySelector('.kix-appview-editor')
  : null;

let isLooping = false;

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

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  switch (message.type) {
    case 'SCROLL_STEP':
      // Perform a single scroll step
      const elements = [element, document?.body, document?.body?.parentNode].filter(Boolean);
      
      for (let elem of elements) {
        const delta = scrollElement(elem, message.pixels, message.loop);
        if (delta) break; // Stop after first successful scroll
      }
      
      sendResponse({ success: true });
      break;
      
    case 'RESET_LOOP':
      isLooping = false;
      sendResponse({ success: true });
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
        title: document.title
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
  } else {
    console.log('Page is now visible');
  }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  chrome.runtime.sendMessage({
    type: 'STOP_SCROLLING'
  }).catch(() => {
    // Ignore errors during page unload
  });
});