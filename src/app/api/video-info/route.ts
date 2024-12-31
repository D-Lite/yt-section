import { NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ytdl from '@distube/ytdl-core';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import { getRandomIPv6 } from '@distube/ytdl-core/lib/utils';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();
        
        if (!ytdl.validateURL(url)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }
         
        let proxyConnectionString = `[REDACTED]`;
    let agent = ytdl.createProxyAgent({
      uri: proxyConnectionString,
    });

    const info = await ytdl.getInfo(url, {
        agent: agent,
        playerClients: ["IOS", "WEB_CREATOR"]
      })
          
        // const info = await ytdl.getBasicInfo(url);
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