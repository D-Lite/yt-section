import { NextResponse } from 'next/server';
import { validateYouTubeURL, getVideoInfo, handleYouTubeError } from '@/lib/youtube-utils';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();
        
        if (!validateYouTubeURL(url)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        console.log('Getting video info...');
        const videoInfo = await getVideoInfo(url);

        return NextResponse.json({
            title: videoInfo.title,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration,
            durationFormatted: videoInfo.durationFormatted,
            availableQualities: videoInfo.availableQualities
        });
    } catch (error) {
        console.error('Video info error:', error);
        
        const errorResponse = handleYouTubeError(error);
        return NextResponse.json(errorResponse, { status: errorResponse.status });
    }
}