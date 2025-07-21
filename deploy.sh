#!/bin/bash

# TestLuy Demo Deployment Script

echo "🚀 Starting TestLuy Demo deployment..."

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t testluy-demo:latest .

# Stop existing container if running
echo "🛑 Stopping existing container..."
docker-compose -f docker-compose.prod.yml down

# Start the new container
echo "▶️ Starting new container..."
docker-compose -f docker-compose.prod.yml up -d

# Show container status
echo "📊 Container status:"
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment complete! Demo should be available at http://localhost:3000"