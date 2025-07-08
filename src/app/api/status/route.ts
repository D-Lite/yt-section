import { NextResponse } from 'next/server';
import { validateYouTubeURL, getVideoInfo } from '@/lib/youtube-utils';

export async function GET() {
    const status = {
        timestamp: new Date().toISOString(),
        youtube: {
            parsing: 'unknown' as 'working' | 'failing' | 'unknown',
            lastTested: null as string | null,
            errorDetails: null as string | null
        },
        system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            nodeVersion: process.version
        }
    };

    // Test with a known working YouTube video
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll - should always work
    
    try {
        console.log('Testing YouTube parsing with known video...');
        await getVideoInfo(testUrl);
        status.youtube.parsing = 'working';
        status.youtube.lastTested = new Date().toISOString();
    } catch (error) {
        status.youtube.parsing = 'failing';
        status.youtube.lastTested = new Date().toISOString();
        status.youtube.errorDetails = error instanceof Error ? error.message : String(error);
    }

    return NextResponse.json(status);
}

export async function POST(request: Request) {
    try {
        const { url } = await request.json();
        
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        if (!validateYouTubeURL(url)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        const startTime = Date.now();
        const videoInfo = await getVideoInfo(url);
        const endTime = Date.now();

        return NextResponse.json({
            success: true,
            responseTime: endTime - startTime,
            videoInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return NextResponse.json({
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
} 