# Use a Node.js base image
FROM node:20-bookworm-slim

# Install system dependencies for Remotion (Chromium, FFmpeg, and browser libs)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    chromium \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    librandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Point Remotion to the installed Chromium
ENV REMOTION_CHROME_EXECUTABLE_PATH=/usr/bin/chromium

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app and build
COPY . .
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Run the server
CMD ["npm", "run", "start"]
