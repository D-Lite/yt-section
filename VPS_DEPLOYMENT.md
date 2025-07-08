# YouTube Downloader - VPS Deployment Guide

## Overview

This YouTube downloader is optimized for VPS deployment with Coolify, providing full video trimming capabilities and robust error handling.

## VPS Advantages

### ✅ **Full Feature Set**
- **Video Trimming**: FFmpeg integration for server-side video processing
- **File System Access**: Full read/write access to `/tmp` directory
- **No Timeout Limits**: No serverless function timeouts
- **Higher Memory Limits**: Can handle larger video files
- **Persistent Storage**: Can implement caching and temporary storage

### ✅ **System Dependencies**
- **FFmpeg**: Installed via nixpacks for video processing
- **Node.js 18**: Optimized runtime
- **Yarn**: Fast package management

## Coolify Deployment

### 1. Repository Setup
```bash
# Clone your repository
git clone <your-repo-url>
cd ytdownload

# Push to your Git provider (GitHub, GitLab, etc.)
git add .
git commit -m "VPS optimized YouTube downloader"
git push origin main
```

### 2. Coolify Configuration
1. **Create New Application** in Coolify
2. **Select Repository** from your Git provider
3. **Choose Build Pack**: `nixpacks`
4. **Set Environment Variables**:
   ```env
   NODE_ENV=production
   NEXT_TELEMETRY_DISABLED=1
   ```

### 3. Resource Allocation
- **CPU**: 1 core (minimum)
- **Memory**: 2GB (recommended for video processing)
- **Storage**: 10GB (for temporary files)
- **Port**: 3000

### 4. Volume Mounts
- **Source**: `/tmp` (host)
- **Target**: `/tmp` (container)
- **Type**: bind

## Alternative VPS Platforms

### Docker Compose
```yaml
version: '3.8'
services:
  youtube-downloader:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - /tmp:/tmp
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### Dockerfile
```dockerfile
FROM node:18-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Direct VPS Installation
```bash
# Install system dependencies
sudo apt update
sudo apt install -y ffmpeg nodejs npm

# Clone and setup application
git clone <your-repo-url>
cd ytdownload
npm install
npm run build

# Run with PM2 for production
npm install -g pm2
pm2 start npm --name "youtube-downloader" -- start
pm2 startup
pm2 save
```

## Performance Optimization

### 1. Memory Management
```javascript
// In your API routes, implement cleanup
process.on('SIGTERM', () => {
  // Cleanup temporary files
  cleanupTempFiles();
});
```

### 2. File System Optimization
```javascript
// Use efficient file operations
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

// Stream processing instead of loading entire file into memory
await pipeline(ytdlStream, createWriteStream(tempPath));
```

### 3. Caching Strategy
```javascript
// Implement Redis caching for video info
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const cacheKey = `video:${videoId}`;
const cached = await redis.get(cacheKey);
```

## Monitoring & Maintenance

### 1. Health Checks
- **Endpoint**: `/api/status`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds

### 2. Log Management
```javascript
// Structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 3. Resource Monitoring
```bash
# Monitor disk usage
df -h /tmp

# Monitor memory usage
free -h

# Monitor CPU usage
htop
```

## Security Considerations

### 1. Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### 2. Input Validation
```javascript
// Validate YouTube URLs
const isValidYouTubeUrl = (url: string) => {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return pattern.test(url);
};
```

### 3. File Cleanup
```javascript
// Automatic cleanup of temporary files
setInterval(() => {
  cleanupTempFiles();
}, 60 * 60 * 1000); // Every hour
```

## Troubleshooting

### Common Issues

1. **FFmpeg Not Found**
   ```bash
   # Check if FFmpeg is installed
   ffmpeg -version
   
   # Rebuild container if needed
   docker-compose down && docker-compose up --build
   ```

2. **Memory Issues**
   ```bash
   # Check memory usage
   docker stats
   
   # Increase memory limit in Coolify
   ```

3. **Disk Space Issues**
   ```bash
   # Clean up temporary files
   rm -rf /tmp/*.mp4
   
   # Check disk usage
   df -h
   ```

### Performance Tuning

1. **Increase Memory Limit**
   - Coolify: 4GB recommended for large videos
   - Docker: `--memory=4g`

2. **Optimize FFmpeg Settings**
   ```javascript
   ffmpeg()
     .input(stream)
     .outputOptions(['-c:v', 'libx264', '-preset', 'fast'])
     .output(tempFilePath)
   ```

3. **Implement Queue System**
   ```javascript
   // For high traffic, implement job queue
   import Bull from 'bull';
   
   const downloadQueue = new Bull('video-download');
   ```

## Backup & Recovery

### 1. Database Backup (if using)
```bash
# Backup configuration
docker exec -it <container> pg_dump -U postgres > backup.sql
```

### 2. Configuration Backup
```bash
# Backup environment variables
coolify export > backup.json
```

### 3. Disaster Recovery
```bash
# Restore from backup
coolify import backup.json
```

## Scaling Considerations

### 1. Horizontal Scaling
- Use load balancer
- Implement session management
- Shared Redis cache

### 2. Vertical Scaling
- Increase CPU cores
- Add more memory
- Use SSD storage

### 3. CDN Integration
- Cloudflare for static assets
- Video streaming optimization
- Geographic distribution 