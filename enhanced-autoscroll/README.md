# Enhanced Autoscroll Chrome Extension

An advanced autoscroll extension that works **without requiring page focus**, allowing you to scroll multiple tabs simultaneously. This extension is inspired by "Simple Autoscroll" but enhanced to solve the focus limitation.

## 🚀 Key Features

### ✅ **Focus-Independent Scrolling**
- **Works without page focus** - scroll pages even when they're in background tabs
- **Multiple tab support** - scroll 3+ pages simultaneously 
- **Persistent scrolling** - continues even when switching between tabs

### ✅ **Advanced Controls**
- Customizable scroll speed (pixels per interval)
- Adjustable timing (milliseconds between scrolls)
- Loop option (automatically return to top when reaching bottom)
- Keyboard shortcut support (Alt+J to toggle)

### ✅ **Smart Compatibility**
- Works on most websites including Google Docs
- Automatic element detection for optimal scrolling
- Graceful error handling for unsupported sites

### ✅ **User Experience**
- Clean, modern popup interface
- Real-time status indicators
- Persistent settings storage
- Input validation and helpful error messages

## 📦 Installation

### Option 1: Load as Unpacked Extension (Recommended for Development)

1. **Download or Clone** this repository to your computer
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** using the toggle in the top-right corner
4. **Click "Load unpacked"** and select the `enhanced-autoscroll` folder
5. **Pin the extension** to your toolbar for easy access

### Option 2: Manual Installation

1. Download all files from this repository
2. Place them in a folder named `enhanced-autoscroll`
3. Follow steps 2-5 from Option 1

## 🎯 How to Use

### Basic Usage

1. **Navigate** to any webpage you want to auto-scroll
2. **Click** the Enhanced Autoscroll extension icon in your toolbar
3. **Adjust settings** if desired:
   - **Scroll pixels**: How many pixels to scroll each step (use negative for upward scrolling)
   - **Duration**: Time between scroll steps in milliseconds (lower = faster)
   - **Loop**: Check to automatically return to top when reaching bottom
4. **Click "Start Scrolling"** to begin
5. **Click "Stop Scrolling"** or use Alt+J to stop

### Multiple Tab Scrolling

1. **Open multiple tabs** with content you want to scroll
2. **Visit each tab** and start scrolling using the extension
3. **Switch freely** between tabs - scrolling continues in background
4. **Manage each tab independently** - stop/start scrolling per tab

### Keyboard Shortcuts

- **Alt+J**: Toggle scrolling on/off for the current tab
- Can be customized at `chrome://extensions/shortcuts`

## ⚙️ Settings

### Scroll Pixels
- **Positive values**: Scroll down (e.g., 5 pixels down per step)
- **Negative values**: Scroll up (e.g., -5 pixels up per step)
- **Range**: -5000 to 5000 pixels
- **Recommended**: 1-10 for smooth scrolling, 20+ for faster scrolling

### Duration (Milliseconds)
- **Lower values**: Faster scrolling (e.g., 10ms = very fast)
- **Higher values**: Slower scrolling (e.g., 100ms = slow)
- **Range**: 1 to 600,000 milliseconds
- **Recommended**: 25-50ms for comfortable reading speed

### Loop Option
- **Enabled**: Automatically scroll back to top when reaching bottom
- **Disabled**: Stop scrolling when reaching bottom

## 🔧 Technical Details

### Architecture
- **Background Service Worker**: Manages scrolling timers for all tabs independently
- **Content Scripts**: Handle actual scrolling operations on each page
- **Popup Interface**: Provides user controls and settings management

### Browser Compatibility
- **Chrome**: Manifest V3 compatible
- **Edge**: Should work with Chromium-based Edge
- **Other browsers**: Not tested, Chrome Web Store compatible

### Permissions
- **Storage**: Save user preferences
- **Tabs**: Manage scrolling across multiple tabs
- **ActiveTab**: Interact with current tab content
- **Host Permissions**: Access all websites for scrolling

## 🆚 Comparison with Simple Autoscroll

| Feature | Simple Autoscroll | Enhanced Autoscroll |
|---------|------------------|-------------------|
| Works without focus | ❌ No | ✅ Yes |
| Multiple tabs | ❌ No | ✅ Yes |
| Background scrolling | ❌ No | ✅ Yes |
| Focus requirement | ✅ Required | ❌ Not required |
| Settings persistence | ✅ Yes | ✅ Yes |
| Keyboard shortcuts | ✅ Yes | ✅ Yes |
| Loop functionality | ✅ Yes | ✅ Yes |

## 🐛 Troubleshooting

### Scrolling Not Working
1. **Refresh the page** and try again
2. **Check if the site blocks extensions** (some banking sites)
3. **Verify extension permissions** in Chrome settings
4. **Try a different scroll speed** (some sites work better with different values)

### Extension Not Loading
1. **Enable Developer Mode** in Chrome extensions
2. **Check for JavaScript errors** in browser console
3. **Reload the extension** from chrome://extensions
4. **Verify all files** are present in the extension folder

### Performance Issues
1. **Reduce scroll frequency** (increase milliseconds value)
2. **Close unnecessary tabs** that are auto-scrolling
3. **Use smaller pixel values** for smoother operation

## 📝 Development

### File Structure
```
enhanced-autoscroll/
├── manifest.json       # Extension configuration
├── background.js       # Service worker for managing scrolling
├── content.js         # Content script for page interaction
├── popup.html         # Extension popup interface
├── popup.js           # Popup functionality
├── popup.css          # Popup styling
├── icon.png           # Extension icon
├── icon.svg           # Vector icon source
└── README.md          # This file
```

### Extending the Code
- **Background script**: Modify `background.js` to add new features
- **Content script**: Edit `content.js` to change scrolling behavior
- **UI**: Update `popup.html`, `popup.css`, and `popup.js` for interface changes

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## 🙏 Acknowledgments

Inspired by the original "Simple Autoscroll" extension by Daniel Berezin. Enhanced to solve the focus limitation and add multi-tab support.