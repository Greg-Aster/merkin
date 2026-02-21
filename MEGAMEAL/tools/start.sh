#!/bin/bash

echo "🛠️  Starting MEGAMEAL Development Tools..."
echo "==================================================="
echo ""
echo "🚀 Zero-install, self-contained development tools"
echo "💻 No dependencies required!"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""
echo "🌐 Starting server..."
echo "📂 Project root: $(cd .. && pwd)"
echo ""

# Start the application
node app.js