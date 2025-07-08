import { NextRequest, NextResponse } from 'next/server';
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

        const tempFileName = `${videoTitle}.mp4`;

        console.log('Starting video download...');
        
        // For cloud deployment, we'll stream the response directly
        // This avoids file system issues and memory constraints
        const stream = createDownloadStream(url, { quality });

        // Create a readable stream that can be returned as a response
        const readable = new ReadableStream({
            start(controller) {
                stream.on('data', (chunk) => {
                    controller.enqueue(chunk);
                });
                
                stream.on('end', () => {
                    controller.close();
                });
                
                stream.on('error', (error) => {
                    console.error('Stream error:', error);
                    controller.error(error);
                });
            }
        });

        // Return the stream as a downloadable response
        return new NextResponse(readable, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${tempFileName}"`,
                'Cache-Control': 'no-cache',
                'Transfer-Encoding': 'chunked'
            },
        });
    } catch (error) {
        console.error('Download error:', error);
        
        const errorResponse = handleYouTubeError(error);
        return NextResponse.json(errorResponse, { status: errorResponse.status });
    }
}
