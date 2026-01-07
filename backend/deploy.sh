#!/bin/bash

# Deploy script for Railway/IDCloudHost
echo "🚀 Deploying KapalList Backend"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Run database migrations
echo "🗄️ Running database migrations..."
node migrate-users.js
node migrate-checklist-columns.js

# Set production environment
export NODE_ENV=production

# Start the server
echo "🔥 Starting server..."
npm start

echo "✅ Backend deployed successfully!"
