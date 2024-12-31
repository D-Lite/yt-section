import { NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ytdl from 'ytdl-core';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getRandomIPv6 } from '@distube/ytdl-core/lib/utils'

export async function POST(request: Request) {
    try {
        const { url } = await request.json();
        
        if (!ytdl.validateURL(url)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        const agentForARandomIP = ytdl.createAgent(undefined, {
            localAddress: getRandomIPv6("2001:2::/48"),
          });
          
        const ydl_opts = {
            agent: agentForARandomIP
        }
        
        const info = await ytdl.getInfo(url, ydl_opts);
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