# Enhanced Autoscroll Focus Loss Fix

## Problem
The original autoscroll extension was losing focus and stopping when users switched to different windows or applications. This happened because browsers aggressively throttle background scripts and timers when tabs are not in focus.

## Root Causes
1. **Browser Timer Throttling**: Browsers limit the frequency of `setInterval` calls in background scripts when tabs are inactive
2. **Service Worker Sleep**: Chrome's service workers can be put to sleep when not actively used
3. **Window Focus Issues**: When switching to a different application entirely, browser throttling becomes even more aggressive
4. **Message Channel Interruption**: Communication between background script and content script can be disrupted

## Solution Overview
Implemented a **dual-timer system** with automatic fallback and self-healing mechanisms:

### 1. **Background Script Timer** (Primary)
- Runs in the service worker for normal operation
- Uses 10ms intervals for precise timing
- Handles multiple tabs simultaneously

### 2. **Content Script Timer** (Fallback)
- Runs locally in each tab's content script
- Activates automatically when background script is throttled
- Uses standard `setInterval` with the same timing settings

### 3. **Heartbeat Monitoring System**
- Background script sends heartbeat messages every 50ms
- Content script monitors heartbeat gaps
- Automatically switches to local mode if heartbeat is interrupted

### 4. **Page Visibility API Integration**
- Detects when page becomes hidden/visible
- Immediately activates local scrolling when page is hidden
- Seamlessly transitions back to background control when visible

## Key Features

### Automatic Fallback
When the background script is throttled:
1. Content script detects missing heartbeats
2. Automatically starts local scrolling timer
3. Continues scrolling with identical settings
4. No user intervention required

### Self-Healing
When background script becomes available again:
1. Background detects content script is using local mode
2. Sends message to stop local scrolling
3. Resumes background-controlled scrolling
4. Ensures no duplicate timers

### Status Indication
- Popup shows "Scrolling (Local Mode)" when using fallback
- Users can see when the extension is working around browser limitations
- Transparent operation status

## Technical Implementation

### Content Script Enhancements (`content.js`)
```javascript
// New variables for local scrolling
let localScrolling = false;
let localScrollTimer = null;
let localScrollSettings = null;
let lastHeartbeat = Date.now();

// Heartbeat monitoring
function startHeartbeatMonitoring() {
  setInterval(() => {
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
    if (timeSinceLastHeartbeat > 100 && localScrollSettings && !localScrolling) {
      startLocalScrolling(localScrollSettings);
    }
  }, 50);
}

// Local scrolling function
function startLocalScrolling(settings) {
  localScrolling = true;
  localScrollTimer = setInterval(performLocalScroll, settings.scrollDuration);
}
```

### Background Script Enhancements (`background.js`)
```javascript
// Enhanced tab tracking
scrollingTabs.set(tabId, {
  ...settings,
  active: true,
  lastScrollTime: Date.now(),
  lastHeartbeat: Date.now(),
  usingLocalScrolling: false
});

// Heartbeat monitoring
function startHeartbeatMonitoring() {
  setInterval(() => {
    // Send heartbeats and detect when to switch to local mode
    if (timeSinceHeartbeat > 100 && !tabData.usingLocalScrolling) {
      switchToLocalScrolling(tabId);
    }
  }, 50);
}
```

### Message Types Added
- `PING`: Content script checking if background is alive
- `HEARTBEAT`: Background script health check
- `START_LOCAL_SCROLLING`: Switch to local mode
- `STOP_LOCAL_SCROLLING`: Return to background mode
- `PAGE_VISIBLE`: Notify when page becomes visible again

## Benefits

### 1. **Reliability**
- Works even when browser aggressively throttles background scripts
- No interruption when switching windows or applications
- Maintains scrolling during system sleep/wake cycles

### 2. **Performance**
- Uses background timer when possible (more efficient)
- Only uses local timer when necessary
- Automatic optimization based on browser behavior

### 3. **Transparency**
- Users can see when local mode is active
- No configuration required
- Seamless operation

### 4. **Compatibility**
- Works with all browser throttling policies
- Compatible with power-saving modes
- Future-proof against browser changes

## Testing the Fix

1. **Load the updated extension** in Chrome
2. **Start autoscroll** on any webpage
3. **Switch to a different application** (e.g., text editor, file manager)
4. **Wait 30+ seconds** while checking the webpage periodically
5. **Verify scrolling continues** even when window loses focus

### Expected Behavior
- Scrolling continues uninterrupted when switching windows
- Popup shows "Scrolling (Local Mode)" when fallback is active
- Seamless transition back to normal mode when returning to browser

## Browser Compatibility
- **Chrome/Chromium**: Full support
- **Firefox**: Should work with manifest adjustments
- **Edge**: Full support (Chromium-based)
- **Safari**: May need additional adaptations

## Future Enhancements
- Web Worker implementation for even more reliable timing
- Adaptive timing based on system performance
- Battery optimization for mobile devices
- Cross-tab synchronization for multiple scrolling tabs

---

This implementation ensures the autoscroll extension works reliably regardless of browser focus policies or system behavior.