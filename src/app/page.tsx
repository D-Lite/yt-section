'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import Image from 'next/image';

interface VideoInfo {
  title: string;
  thumbnail: string;
  availableQualities: {
    qualityLabel: string;
    itag: string;
    container: string;
    fps: number;
  }[];
}

export default function Home() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [timeFormat, setTimeFormat] = useState<'seconds' | 'hh:mm:ss'>('seconds');

  const { register, handleSubmit, getValues } = useForm({
    defaultValues: {
      url: '',
      startTime: '',
      endTime: ''
    }
  });

  const fetchVideoInfo = async (url: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) throw new Error('Failed to fetch video info');

      const data = await response.json();
      setVideoInfo(data);
    } catch {
      setError('Failed to fetch video information');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: { url: string; startTime: string; endTime: string; }) => {
    try {
      setLoading(true);
      setError(null);
      setDownloadProgress(0);

      const startTimeInSeconds = timeFormat === 'seconds' ? parseInt(data.startTime, 10) : convertToSeconds(data.startTime);
      const endTimeInSeconds = timeFormat === 'seconds' ? parseInt(data.endTime, 10) : convertToSeconds(data.endTime);

      const requestData = {
        ...data,
        startTime: startTimeInSeconds,
        endTime: endTimeInSeconds
      };

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      if (videoInfo) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${videoInfo.title}.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }

      setDownloadProgress(100);
      alert('Video downloaded successfully.');
    } catch {
      setError('Download failed');
    } finally {
      setLoading(false);
    }
  };

  const convertToSeconds = (time: string) => {
    const parts = time.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header>
        <Image src={'/yt.png'} width={100} height={100} alt='youtube section downloader' />
      </header>
      <main className="container mx-auto p-4 max-w-2xl flex-grow">
        <Card>
          <CardHeader>
            <CardTitle>YouTube Video Downloader</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-700">
              This application allows you to download YouTube videos by providing the video URL.
              You can specify the start and end times for the video segment you want to download.
              Simply enter the URL, select the desired time format, and click Download to get your video!
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="url">YouTube URL</Label>
                <div className="flex gap-2">
                  <Input
                    {...register('url', { required: true })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => fetchVideoInfo(getValues('url'))}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'Fetch Info'}
                  </Button>
                </div>
              </div>

              {videoInfo && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <img
                      src={videoInfo.thumbnail}
                      alt="Video thumbnail"
                      className="w-40 h-auto rounded"
                    />
                    <div>
                      <h3 className="font-medium">{videoInfo.title}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="startTime">Time Format</Label>
                      <div className="flex gap-2">
                        <Select defaultValue='seconds' onValueChange={(value) => setTimeFormat(value as 'seconds' | 'hh:mm:ss')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="seconds">Seconds</SelectItem>
                            <SelectItem value="hh:mm:ss">hh:mm:ss</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <div className="flex gap-2">
                        <Input
                          {...register('startTime', { required: true })}
                          type={timeFormat === 'seconds' ? 'number' : 'text'}
                          placeholder={timeFormat === 'seconds' ? '0' : '00:00:00'}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <div className="flex gap-2">
                        <Input
                          {...register('endTime', { required: true })}
                          type={timeFormat === 'seconds' ? 'number' : 'text'}
                          placeholder={timeFormat === 'seconds' ? '0' : '00:00:00'}
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : 'Download'}
                  </Button>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {downloadProgress !== null && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
      <footer className="bg-gray-800 text-white py-4 mt-auto">
        <div className="container mx-auto text-center">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Your Name. All rights reserved.
            <br />
            Made with ❤️ by <a href="https://twitter.com/danielolabemiwo" target="_blank" rel="noopener noreferrer" className="text-blue-400">Daniel Olabemiwo</a>
          </p>
        </div>
      </footer>
    </div>
  );
}