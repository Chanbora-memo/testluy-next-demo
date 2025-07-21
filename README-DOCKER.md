# TestLuy Demo Docker Deployment

This guide explains how to deploy the TestLuy Next.js demo using Docker.

## Quick Start

### Local Development
```bash
# Build and run locally
docker-compose up --build
```

### Production Deployment

1. **Copy files to your server:**
   ```bash
   # Copy these files to your server:
   - Dockerfile
   - docker-compose.prod.yml
   - .env.example
   - deploy.sh (optional)
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Deploy using docker-compose:**
   ```bash
   # Build and run
   docker build -t testluy-demo:latest .
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Or use the deployment script:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Docker Commands

### Build Image
```bash
docker build -t testluy-demo:latest .
```

### Run Container
```bash
docker run -p 3000:3000 --env-file .env testluy-demo:latest
```

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Stop Container
```bash
docker-compose -f docker-compose.prod.yml down
```

## Environment Variables

Create a `.env` file with your configuration:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
TESTLUY_API_KEY=your_api_key_here
TESTLUY_SECRET_KEY=your_secret_key_here
NODE_ENV=production
```

## Health Check

The production compose file includes a health check. Monitor with:
```bash
docker-compose -f docker-compose.prod.yml ps
```

## Troubleshooting

### Check container logs:
```bash
docker-compose -f docker-compose.prod.yml logs testluy-demo
```

### Access container shell:
```bash
docker-compose -f docker-compose.prod.yml exec testluy-demo sh
```

### Rebuild after changes:
```bash
docker-compose -f docker-compose.prod.yml down
docker build -t testluy-demo:latest .
docker-compose -f docker-compose.prod.yml up -d
```