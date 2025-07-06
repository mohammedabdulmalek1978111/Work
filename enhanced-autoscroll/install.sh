#!/bin/bash

echo "Enhanced Autoscroll Chrome Extension Installer"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found. Please run this script from the extension directory."
    exit 1
fi

echo "✅ Extension files found!"
echo ""

# Verify required files
required_files=("manifest.json" "background.js" "content.js" "popup.html" "popup.js" "popup.css" "icon.png")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ Missing required files:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    echo ""
    echo "Please ensure all files are present before installing."
    exit 1
fi

echo "✅ All required files present!"
echo ""

# Display installation instructions
echo "📦 Installation Instructions:"
echo ""
echo "1. Open Google Chrome"
echo "2. Navigate to: chrome://extensions/"
echo "3. Enable 'Developer mode' (toggle in top-right corner)"
echo "4. Click 'Load unpacked'"
echo "5. Select this folder: $(pwd)"
echo "6. The extension should now appear in your extensions list"
echo "7. Pin it to your toolbar for easy access"
echo ""

echo "🎯 Usage:"
echo "- Click the extension icon to open controls"
echo "- Set scroll speed and timing"
echo "- Click 'Start Scrolling' to begin"
echo "- Use Alt+J to toggle scrolling on/off"
echo "- Works on multiple tabs simultaneously!"
echo ""

echo "📁 Extension Directory: $(pwd)"
echo ""
echo "Ready to install! Follow the instructions above."