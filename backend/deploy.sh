#!/bin/bash

# Deploy script for IDCloudHost
echo "🚀 Deploying KapalList Backend to IDCloudHost"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Set production environment
export NODE_ENV=production

# Start the server
echo "🔥 Starting server..."
npm start

echo "✅ Backend deployed successfully!"
echo "🌐 Your API will be available at your IDCloudHost domain"
