# YouTube Video Downloader

A robust YouTube video downloader built with Next.js, featuring video trimming capabilities and optimized for VPS deployment.

## Features

- ✅ **Video Download**: Download YouTube videos in various qualities
- ✅ **Video Trimming**: Server-side video trimming with FFmpeg
- ✅ **Multiple Formats**: Support for different time formats (seconds, hh:mm:ss)
- ✅ **Robust Error Handling**: Fallback mechanisms for YouTube parsing issues
- ✅ **Progress Tracking**: Real-time download progress
- ✅ **VPS Optimized**: Designed for Coolify and other VPS platforms

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Video Processing**: FFmpeg, fluent-ffmpeg
- **YouTube Download**: @distube/ytdl-core, ytdl-core
- **Deployment**: Coolify, Docker, Nixpacks

## Quick Start

### Prerequisites

- Node.js 18+
- FFmpeg (installed automatically via nixpacks)
- Git

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd ytdownload

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### VPS Deployment

This application is optimized for VPS deployment with Coolify. See [VPS_DEPLOYMENT.md](./VPS_DEPLOYMENT.md) for detailed deployment instructions.

## Usage

1. **Enter YouTube URL**: Paste a valid YouTube video URL
2. **Fetch Video Info**: Click "Fetch Info" to get video details
3. **Set Time Range** (Optional): Specify start and end times for trimming
4. **Download**: Click "Download" to get your video

## API Endpoints

- `POST /api/video-info` - Get video information
- `POST /api/download` - Download video (with optional trimming)
- `GET /api/status` - System health check

## Configuration

### Environment Variables

```env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions, please check the [VPS_DEPLOYMENT.md](./VPS_DEPLOYMENT.md) guide or open an issue on GitHub.