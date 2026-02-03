#!/bin/bash

# Create a log file on the desktop for debugging
LOGFILE="$HOME/Desktop/WritersVoice_Log.txt"
exec > >(tee -a "$LOGFILE") 2>&1

echo "--- Starting Writers Voice Launch: $(date) ---"

# Fix path to ensure npm is found (common issue when running via double-click on macOS)
export PATH=/usr/local/bin:/opt/homebrew/bin:$PATH
echo "PATH: $PATH"

# Navigate to the project directory
cd "$(dirname "$0")"
echo "Working Directory: $(pwd)"

echo "Checking environment..."

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm could not be found."
    echo "Please install Node.js from https://nodejs.org/"
    read -n 1 -s -r -p "Press any key to exit..."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies first..."
    if ! npm install; then
        echo "Error: Failed to install dependencies. Please check your internet connection or node installation."
        read -n 1 -s -r -p "Press any key to exit..."
        exit 1
    fi
fi

# Kill any existing process on port 5177 to avoid conflicts
echo "Cleaning up ports..."
lsof -ti:5177 | xargs kill -9 2>/dev/null

# Start the dev server in the background
echo "Starting Writers Voice Local Server..."
npm run dev -- --port 5177 &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"

# Wait for the server to be ready
echo "Waiting for application to launch..."
sleep 5

# Open in Chrome App Mode
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL="http://localhost:5177"

if [ -f "$CHROME" ]; then
    echo "Launching in Standalone App Mode..."
    "$CHROME" --app="$URL" --new-window >/dev/null 2>&1 &
else
    echo "Chrome not found at standard path, opening in default browser..."
    open "$URL"
fi

echo "
===================================================
   Writers Voice is running!

   - Do not close this terminal window.
   - To stop the app, press Ctrl+C here.
===================================================
"

# Keep script running to maintain the server
# Kill the server when the script is terminated
trap "kill $SERVER_PID" EXIT
wait $SERVER_PID
