console.log('Enhanced Autoscroll Popup Script Loaded');

// DOM elements
const scrollPixelsInput = document.getElementById('scrollPixels');
const scrollDurationInput = document.getElementById('scrollDuration');
const loopCheckbox = document.getElementById('loop');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const statusElement = document.getElementById('status');
const saveMessage = document.getElementById('saveMessage');
const errorMessage = document.getElementById('errorMessage');

// Default settings
const defaultSettings = {
  scrollDuration: 25,
  scrollPixels: 5,
  loop: false
};

// Current state
let isScrolling = false;

// Initialize popup
async function initializePopup() {
  try {
    // Load saved settings
    const result = await chrome.storage.sync.get(['defaultSettings']);
    const settings = result.defaultSettings || defaultSettings;
    
    // Update form with saved settings
    scrollPixelsInput.value = settings.scrollPixels;
    scrollDurationInput.value = settings.scrollDuration;
    loopCheckbox.checked = settings.loop;
    
    // Check current scrolling status
    await updateScrollingStatus();
    
    console.log('Popup initialized with settings:', settings);
  } catch (error) {
    console.error('Error initializing popup:', error);
    showError('Failed to load settings');
  }
}

// Update scrolling status
async function updateScrollingStatus() {
  try {
    // First check background script status
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    isScrolling = response.isScrolling;
    
    // If scrolling, also check if using local scrolling
    if (isScrolling) {
      try {
        // Query the active tab to get page info including local scrolling status
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          const pageInfo = await chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_INFO' });
          if (pageInfo && pageInfo.localScrolling) {
            updateUI('local');
            return;
          }
        }
      } catch (error) {
        // Content script might not be available, fallback to normal status
        console.log('Could not check local scrolling status:', error);
      }
    }
    
    updateUI();
  } catch (error) {
    console.error('Error getting status:', error);
    isScrolling = false;
    updateUI();
  }
}

// Update UI based on current state
function updateUI(mode = 'normal') {
  if (isScrolling) {
    if (mode === 'local') {
      statusElement.textContent = 'Scrolling (Local Mode)';
      statusElement.className = 'status scrolling local';
    } else {
      statusElement.textContent = 'Scrolling';
      statusElement.className = 'status scrolling';
    }
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    statusElement.textContent = 'Ready';
    statusElement.className = 'status';
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

// Start scrolling
async function startScrolling() {
  try {
    const settings = getFormSettings();
    
    if (!validateSettings(settings)) {
      return;
    }
    
    const response = await chrome.runtime.sendMessage({
      type: 'START_SCROLLING_FROM_POPUP',
      ...settings
    });
    
    if (response.success) {
      isScrolling = true;
      updateUI();
      hideMessages();
    } else {
      showError('Failed to start scrolling');
    }
  } catch (error) {
    console.error('Error starting scrolling:', error);
    showError('Unable to connect to the current tab. Try refreshing the page.');
  }
}

// Stop scrolling
async function stopScrolling() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'STOP_SCROLLING_FROM_POPUP'
    });
    
    if (response.success) {
      isScrolling = false;
      updateUI();
      hideMessages();
    } else {
      showError('Failed to stop scrolling');
    }
  } catch (error) {
    console.error('Error stopping scrolling:', error);
    showError('Failed to stop scrolling');
  }
}

// Save settings as default
async function saveAsDefault() {
  try {
    const settings = getFormSettings();
    
    if (!validateSettings(settings)) {
      return;
    }
    
    await chrome.storage.sync.set({ defaultSettings: settings });
    showSaveMessage();
    
    console.log('Settings saved:', settings);
  } catch (error) {
    console.error('Error saving settings:', error);
    showError('Failed to save settings');
  }
}

// Get settings from form
function getFormSettings() {
  return {
    scrollPixels: parseInt(scrollPixelsInput.value, 10),
    scrollDuration: parseInt(scrollDurationInput.value, 10),
    loop: loopCheckbox.checked
  };
}

// Validate settings
function validateSettings(settings) {
  if (isNaN(settings.scrollPixels) || settings.scrollPixels === 0) {
    showError('Scroll pixels must be a non-zero number');
    return false;
  }
  
  if (isNaN(settings.scrollDuration) || settings.scrollDuration < 1) {
    showError('Duration must be at least 1 millisecond');
    return false;
  }
  
  if (Math.abs(settings.scrollPixels) > 5000) {
    showError('Scroll pixels should be between -5000 and 5000');
    return false;
  }
  
  if (settings.scrollDuration > 600000) {
    showError('Duration should not exceed 600,000 milliseconds (10 minutes)');
    return false;
  }
  
  return true;
}

// Show save message
function showSaveMessage() {
  hideMessages();
  saveMessage.classList.remove('hidden');
  
  setTimeout(() => {
    saveMessage.classList.add('hidden');
  }, 3000);
}

// Show error message
function showError(message) {
  hideMessages();
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  
  setTimeout(() => {
    errorMessage.classList.add('hidden');
  }, 5000);
}

// Hide all messages
function hideMessages() {
  saveMessage.classList.add('hidden');
  errorMessage.classList.add('hidden');
}

// Handle form submission
function handleFormSubmit(event) {
  event.preventDefault();
  if (!isScrolling) {
    startScrolling();
  }
}

// Add event listeners
startBtn.addEventListener('click', startScrolling);
stopBtn.addEventListener('click', stopScrolling);
saveBtn.addEventListener('click', saveAsDefault);

// Handle Enter key in form
document.getElementById('scrollForm').addEventListener('submit', handleFormSubmit);

// Add input validation listeners
scrollPixelsInput.addEventListener('input', () => {
  const value = parseInt(scrollPixelsInput.value, 10);
  if (value > 5000) scrollPixelsInput.value = 5000;
  if (value < -5000) scrollPixelsInput.value = -5000;
});

scrollDurationInput.addEventListener('input', () => {
  const value = parseInt(scrollDurationInput.value, 10);
  if (value > 600000) scrollDurationInput.value = 600000;
  if (value < 1) scrollDurationInput.value = 1;
});

// Update status periodically
setInterval(updateScrollingStatus, 1000);

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', initializePopup);