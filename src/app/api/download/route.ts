import { NextRequest, NextResponse } from 'next/server';
import { unlink, readFile } from 'fs/promises';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';

export async function POST(request: NextRequest) {
    try {
        const { url, startTime, endTime, quality } = await request.json();

        if (!ytdl.validateURL(url)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        const info = await ytdl.getInfo(url);
        const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        const finalStartTime = (startTime);
        const finalEndTime = (endTime);
        const duration = finalEndTime - finalStartTime;

        if (duration <= 0) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }
        const randomString = Math.random().toString(36).substr(2, 9);
        const tempFileName = `${videoTitle}-${randomString}.mp4`;
        const tempFilePath = path.join('/tmp', tempFileName);

        // Download and process video
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(ytdl(url, {
                    quality: quality || 'highest',
                    filter: 'videoandaudio'
                }))
                .setStartTime(finalStartTime)
                .setDuration(duration)
                .output(tempFilePath)
                .on('end', resolve)
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .run();
        });

        // Read the file content
        const fileContent = await readFile(tempFilePath);

        // Delete the temporary file after reading its content
        await unlink(tempFilePath);

        // Return the file as a downloadable response
        return new NextResponse(fileContent, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${tempFileName}"`,
            },
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
