import { NextResponse } from 'next/server';
// @ts-ignore
import ytdl from 'ytdl-core';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();
        
        if (!ytdl.validateURL(url)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        const info = await ytdl.getInfo(url);
        const formats = info.formats
            .filter((format: ytdl.videoFormat) => format.hasVideo && format.hasAudio)
            .map((format: ytdl.videoFormat) => ({
                qualityLabel: format.qualityLabel,
                itag: format.itag,
                container: format.container,
                fps: format.fps
            }));

        return NextResponse.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            availableQualities: formats
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed to fetch video info' }, { status: 500 });
    }
}