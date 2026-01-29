FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies (production only)
RUN npm install --omit=dev

# Copy source code
COPY backend backend

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
