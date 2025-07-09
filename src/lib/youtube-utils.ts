// YouTube download utilities with fallback mechanisms
import ytdl from '@distube/ytdl-core';
import ytdlOriginal from 'ytdl-core';

export interface VideoInfo {
    title: string;
    thumbnail: string;
    duration: number; // Duration in seconds
    durationFormatted: string; // Duration in HH:MM:SS format
    availableQualities: Array<{
        qualityLabel: string;
        itag: number;
        container: string;
        fps?: number;
    }>;
}

export interface DownloadOptions {
    quality?: string;
    startTime?: number;
    endTime?: number;
}

export interface VideoFormat {
    hasVideo: boolean;
    hasAudio: boolean;
    qualityLabel?: string;
    itag: number;
    container: string;
    fps?: number;
}

// User agents to rotate through to avoid bot detection
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
];

// Simple rate limiting - track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // Minimum 2 seconds between requests

// Helper function to get a random user agent
function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Helper function to enforce rate limiting
async function enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
        await sleep(waitTime);
    }
    
    lastRequestTime = Date.now();
}

// Helper function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

// Helper function to get video info using YouTube Data API (fallback)
async function getVideoInfoFromAPI(videoId: string): Promise<Partial<VideoInfo> | null> {
    // TODO: Implement this
    return null;
}

// Helper function to sleep for a given number of milliseconds
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to add random delay between requests
async function randomDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await sleep(delay);
}

// Helper function to retry with exponential backoff
async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            if (attempt === maxRetries) {
                throw lastError;
            }
            
            if (!isRetryableError(error)) {
                throw lastError;
            }
            
            // Use longer delays for bot detection errors
            let delay: number;
            const errorMessage = lastError.message;
            
            if (errorMessage.includes('Sign in to confirm you\'re not a bot') || 
                errorMessage.includes('Status code: 410') ||
                errorMessage.includes('detecting automated requests')) {
                delay = baseDelay * Math.pow(3, attempt) + Math.random() * 5000;
                console.log(`Bot detection detected on attempt ${attempt + 1}, waiting ${Math.round(delay/1000)}s before retry...`);
            } else {
                delay = baseDelay * Math.pow(2, attempt);
                console.log(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay/1000)}s...`);
            }
            
            await sleep(delay);
        }
    }
    
    throw lastError!;
}

// Helper function to validate YouTube URL with multiple libraries
export function validateYouTubeURL(url: string): boolean {
    try {
        return ytdl.validateURL(url) || ytdlOriginal.validateURL(url);
    } catch {
        return false;
    }
}

// Helper function to get video info with fallback and retry
export async function getVideoInfo(url: string, retryCount: number = 2): Promise<VideoInfo> {
    return retryWithBackoff(async () => {
        let info;
        let usedLibrary = '';

        // Enforce rate limiting and add random delay before making requests
        await enforceRateLimit();
        await randomDelay(500, 1500);

        // Try distube version first with custom headers
        try {
            console.log('Attempting to get video info with @distube/ytdl-core...');
            const userAgent = getRandomUserAgent();
            info = await ytdl.getInfo(url, {
                requestOptions: {
                    headers: {
                        'User-Agent': userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                    }
                }
            });
            usedLibrary = '@distube/ytdl-core';
        } catch (error) {
            console.log('@distube/ytdl-core failed, trying original ytdl-core...');
            try {
                // Add another random delay before trying the fallback
                await randomDelay(1000, 2000);
                const userAgent = getRandomUserAgent();
                info = await ytdlOriginal.getInfo(url, {
                    requestOptions: {
                        headers: {
                            'User-Agent': userAgent,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Accept-Encoding': 'gzip, deflate',
                            'DNT': '1',
                            'Connection': 'keep-alive',
                            'Upgrade-Insecure-Requests': '1',
                        }
                    }
                });
                usedLibrary = 'ytdl-core';
            } catch (fallbackError) {
                console.error('Both ytdl-core versions failed:', { error, fallbackError });
                
                // Check for specific bot detection errors
                const errorMessage = error instanceof Error ? error.message : String(error);
                const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                
                if (errorMessage.includes('Sign in to confirm you\'re not a bot') || 
                    fallbackErrorMessage.includes('Sign in to confirm you\'re not a bot') ||
                    errorMessage.includes('Status code: 410') ||
                    fallbackErrorMessage.includes('Status code: 410')) {
                    
                    // Try to get basic info from video ID as last resort
                    const videoId = extractVideoId(url);
                    if (videoId) {
                        console.log('Attempting to get basic info from video ID...');
                        const basicInfo = await getVideoInfoFromAPI(videoId);
                        if (basicInfo) {
                            return {
                                title: basicInfo.title || 'Unknown Title',
                                thumbnail: basicInfo.thumbnail || '',
                                duration: basicInfo.duration || 0,
                                durationFormatted: basicInfo.durationFormatted || 'N/A',
                                availableQualities: basicInfo.availableQualities || []
                            };
                        }
                    }
                    
                    throw new Error('YouTube is detecting automated requests. Please try again later or use a different video.');
                }
                
                throw new Error(`Failed to get video info. Both libraries failed to parse YouTube's obfuscation.`);
            }
        }

        console.log(`Successfully got video info using ${usedLibrary}`);

        // Filter formats that have both video and audio
        const formats = info.formats
            .filter((format: VideoFormat) => format.hasVideo && format.hasAudio)
            .map((format: VideoFormat) => ({
                qualityLabel: format.qualityLabel || 'Unknown',
                itag: format.itag,
                container: format.container,
                fps: format.fps
            }));

        return {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0]?.url || '',
            duration: parseInt(info.videoDetails.lengthSeconds) || 0,
            durationFormatted: info.videoDetails.lengthSeconds ? formatDuration(parseInt(info.videoDetails.lengthSeconds)) : 'N/A',
            availableQualities: formats
        };
    }, retryCount);
}

// Helper function to create download stream with fallback
export function createDownloadStream(url: string, options: DownloadOptions = {}) {
    const downloadOptions = {
        quality: options.quality || 'highest',
        filter: 'videoandaudio' as const,
        requestOptions: {
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        }
    };

    // Try distube version first
    try {
        console.log('Attempting to create download stream with @distube/ytdl-core...');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ytdl(url, downloadOptions as any);
    } catch (error) {
        console.log('@distube/ytdl-core failed, trying original ytdl-core...');
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return ytdlOriginal(url, downloadOptions as any);
        } catch (fallbackError) {
            console.error('Both ytdl-core versions failed for stream creation:', { error, fallbackError });
            
            // Check for specific bot detection errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
            
            if (errorMessage.includes('Sign in to confirm you\'re not a bot') || 
                fallbackErrorMessage.includes('Sign in to confirm you\'re not a bot') ||
                errorMessage.includes('Status code: 410') ||
                fallbackErrorMessage.includes('Status code: 410')) {
                throw new Error('YouTube is detecting automated requests. Please try again later or use a different video.');
            }
            
            throw new Error('Failed to create download stream. Both libraries failed to parse YouTube\'s obfuscation.');
        }
    }
}

// Helper function to sanitize filename
export function sanitizeFilename(filename: string): string {
    return filename.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '-');
}

// Helper function to handle specific YouTube parsing errors
export function handleYouTubeError(error: unknown): { error: string; details: string; status: number } {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle bot detection errors
    if (errorMessage.includes('Sign in to confirm you\'re not a bot') || errorMessage.includes('Status code: 410')) {
        return {
            error: 'YouTube is detecting automated requests. Please try again later or use a different video.',
            details: 'Bot detection triggered - YouTube is blocking automated requests',
            status: 429
        };
    }
    
    if (errorMessage.includes('Could not parse decipher function')) {
        return {
            error: 'YouTube has updated their security measures. Please try again later.',
            details: 'Decipher function parsing failed - YouTube may have updated their obfuscation',
            status: 503
        };
    }
    
    if (errorMessage.includes('Could not parse n transform function')) {
        return {
            error: 'YouTube has updated their security measures. Please try again later.',
            details: 'Transform function parsing failed - YouTube may have updated their obfuscation',
            status: 503
        };
    }
    
    if (errorMessage.includes('Video unavailable')) {
        return {
            error: 'This video is unavailable or private.',
            details: 'Video may be private, deleted, or region-restricted',
            status: 404
        };
    }
    
    if (errorMessage.includes('Sign in to confirm your age')) {
        return {
            error: 'This video requires age verification.',
            details: 'Video is age-restricted and cannot be downloaded',
            status: 403
        };
    }
    
    return {
        error: 'Download failed',
        details: errorMessage,
        status: 500
    };
}

// Helper function to check if error is retryable
export function isRetryableError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // These errors are typically temporary and can be retried
    const retryableErrors = [
        'Could not parse decipher function',
        'Could not parse n transform function',
        'Network timeout',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND'
    ];
    
    // Bot detection errors are retryable but with longer delays (handled in retryWithBackoff)
    const retryableBotErrors = [
        'Sign in to confirm you\'re not a bot',
        'Status code: 410',
        'detecting automated requests'
    ];
    
    // Check if it's a bot detection error - these are retryable with longer delays
    if (retryableBotErrors.some(botError => errorMessage.includes(botError))) {
        return true;
    }
    
    return retryableErrors.some(retryableError => 
        errorMessage.includes(retryableError)
    );
}

// Helper function to get recommended quality based on available formats
export function getRecommendedQuality(formats: VideoFormat[]): string {
    // Prefer 720p if available
    const preferredQualities = ['720p', '480p', '360p', '240p'];
    
    for (const quality of preferredQualities) {
        const format = formats.find((f: VideoFormat) => f.qualityLabel?.includes(quality));
        if (format) {
            return format.itag.toString();
        }
    }
    
    // Fallback to highest available
    return 'highest';
} 

// Helper function to format duration in seconds to HH:MM:SS
function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
} 