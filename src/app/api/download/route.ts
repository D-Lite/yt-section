import { NextRequest, NextResponse } from 'next/server';
import { unlink, readFile } from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { 
    validateYouTubeURL, 
    getVideoInfo, 
    createDownloadStream, 
    sanitizeFilename, 
    handleYouTubeError 
} from '@/lib/youtube-utils';

export async function POST(request: NextRequest) {
    try {
        const { url, startTime, endTime, quality } = await request.json();

        if (!validateYouTubeURL(url)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        console.log('Getting video info...');
        const videoInfo = await getVideoInfo(url);
        const videoTitle = sanitizeFilename(videoInfo.title);

        const finalStartTime = startTime || 0;
        const finalEndTime = endTime || 0;
        const duration = finalEndTime - finalStartTime;

        if (duration < 0) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }

        const randomString = Math.random().toString(36).substr(2, 9);
        const tempFileName = `${videoTitle}-${randomString}.mp4`;
        const tempFilePath = path.join('/tmp', tempFileName);

        console.log('Starting video download and processing...');
        
        // Check if trimming is requested
        const needsTrimming = finalStartTime > 0 || (finalEndTime > 0 && duration > 0);
        
        if (needsTrimming) {
            console.log(`Trimming video from ${finalStartTime}s to ${finalEndTime}s (duration: ${duration}s)`);
            
            // Download and process video with FFmpeg trimming
            await new Promise((resolve, reject) => {
                let stream;
                try {
                    stream = createDownloadStream(url, { quality });
                } catch (streamError) {
                    reject(streamError);
                    return;
                }

                const ffmpegCommand = ffmpeg()
                    .input(stream)
                    .output(tempFilePath);

                // Apply trimming if specified
                if (finalStartTime > 0) {
                    ffmpegCommand.setStartTime(finalStartTime);
                }
                
                if (duration > 0) {
                    ffmpegCommand.setDuration(duration);
                }

                ffmpegCommand
                    .on('end', () => {
                        console.log('Video processing completed successfully');
                        resolve(true);
                    })
                    .on('error', (err) => {
                        console.error('FFmpeg error:', err);
                        reject(err);
                    })
                    .on('progress', (progress) => {
                        if (progress.percent !== undefined) {
                            console.log('Processing progress:', progress.percent, '%');
                        }
                    })
                    .run();
            });
        } else {
            console.log('Downloading full video without trimming...');
            
            // Download full video without trimming
            await new Promise((resolve, reject) => {
                let stream;
                try {
                    stream = createDownloadStream(url, { quality });
                } catch (streamError) {
                    reject(streamError);
                    return;
                }

                ffmpeg()
                    .input(stream)
                    .output(tempFilePath)
                    .on('end', () => {
                        console.log('Video download completed successfully');
                        resolve(true);
                    })
                    .on('error', (err) => {
                        console.error('FFmpeg error:', err);
                        reject(err);
                    })
                    .on('progress', (progress) => {
                        if (progress.percent !== undefined) {
                            console.log('Download progress:', progress.percent, '%');
                        }
                    })
                    .run();
            });
        }

        console.log('Reading processed file...');
        // Read the file content
        const fileContent = await readFile(tempFilePath);

        // Delete the temporary file after reading its content
        await unlink(tempFilePath);
        console.log('Temporary file cleaned up');

        // Return the file as a downloadable response
        return new NextResponse(fileContent, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${tempFileName}"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
        });
    } catch (error) {
        console.error('Download error:', error);
        
        const errorResponse = handleYouTubeError(error);
        return NextResponse.json(errorResponse, { status: errorResponse.status });
    }
}
