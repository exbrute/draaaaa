#!/bin/bash

# Marketplace Bot Launcher Script

echo "🚀 Starting Marketplace Telegram Bot..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt --quiet

# Check if settings.json exists
if [ ! -f "settings.json" ]; then
    echo "⚠️  settings.json not found. Creating from template..."
    cat > settings.json << 'EOF'
{
  "bot_token": "YOUR_BOT_TOKEN_HERE",
  "api_id": 0,
  "api_hash": "YOUR_API_HASH_HERE",
  "api_url": "http://localhost:3000",
  "admin_ids": [],
  "target_user": "durov",
  "banker_session": "banker",
  "maintenance_mode": false
}
EOF
    echo "❌ Please edit settings.json with your credentials and run again."
    exit 1
fi

# Create sessions directory if it doesn't exist
mkdir -p sessions

# Run the bot
echo "✅ Starting bot..."
python3 unified_marketplace_bot.py

# Deactivate virtual environment on exit
deactivate
