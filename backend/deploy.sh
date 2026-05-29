#!/bin/bash

# Deploy script for Railway/IDCloudHost
echo "🚀 Deploying KapalList Backend"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Check if DATABASE_URL is set (Railway) or use local
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set - checking for local postgres..."
  # Try local postgres connection
  if [ -n "$LOCAL_DB_URL" ]; then
    export DATABASE_URL="$LOCAL_DB_URL"
    echo "✅ Using local database: $LOCAL_DB_URL"
  else
    echo "⚠️  No database URL configured - server will attempt to initialize on startup"
  fi
fi

# Set production environment
export NODE_ENV=production

# Start the server - it will create schemas and tables automatically
echo "🔥 Starting server..."
echo "📝 Server will initialize schemas and tables on startup..."
npm start

echo "✅ Backend deployed successfully!"
