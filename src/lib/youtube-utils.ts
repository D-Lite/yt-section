// YouTube download utilities with fallback mechanisms
import ytdl from '@distube/ytdl-core';
import ytdlOriginal from 'ytdl-core';

export interface VideoInfo {
    title: string;
    thumbnail: string;
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

// Helper function to sleep for a given number of milliseconds
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
            
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
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

        // Try distube version first
        try {
            console.log('Attempting to get video info with @distube/ytdl-core...');
            info = await ytdl.getInfo(url);
            usedLibrary = '@distube/ytdl-core';
        } catch (error) {
            console.log('@distube/ytdl-core failed, trying original ytdl-core...');
            try {
                info = await ytdlOriginal.getInfo(url);
                usedLibrary = 'ytdl-core';
            } catch (fallbackError) {
                console.error('Both ytdl-core versions failed:', { error, fallbackError });
                throw new Error(`Failed to get video info. Both libraries failed to parse YouTube's obfuscation.`);
            }
        }

        console.log(`Successfully got video info using ${usedLibrary}`);

        // Filter formats that have both video and audio
        const formats = info.formats
            .filter((format: any) => format.hasVideo && format.hasAudio)
            .map((format: any) => ({
                qualityLabel: format.qualityLabel,
                itag: format.itag,
                container: format.container,
                fps: format.fps
            }));

        return {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0]?.url || '',
            availableQualities: formats
        };
    }, retryCount);
}

// Helper function to create download stream with fallback
export function createDownloadStream(url: string, options: DownloadOptions = {}) {
    const downloadOptions: any = {
        quality: options.quality || 'highest',
        filter: 'videoandaudio'
    };

    // Try distube version first
    try {
        console.log('Attempting to create download stream with @distube/ytdl-core...');
        return ytdl(url, downloadOptions);
    } catch (error) {
        console.log('@distube/ytdl-core failed, trying original ytdl-core...');
        try {
            return ytdlOriginal(url, downloadOptions);
        } catch (fallbackError) {
            console.error('Both ytdl-core versions failed for stream creation:', { error, fallbackError });
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
    
    return retryableErrors.some(retryableError => 
        errorMessage.includes(retryableError)
    );
}

// Helper function to get recommended quality based on available formats
export function getRecommendedQuality(formats: any[]): string {
    // Prefer 720p if available
    const preferredQualities = ['720p', '480p', '360p', '240p'];
    
    for (const quality of preferredQualities) {
        const format = formats.find((f: any) => f.qualityLabel?.includes(quality));
        if (format) {
            return format.itag.toString();
        }
    }
    
    // Fallback to highest available
    return 'highest';
} 