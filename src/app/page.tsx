'use client';

export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, Scissors, Info } from "lucide-react";
import Image from 'next/image';

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  durationFormatted: string;
  availableQualities: {
    qualityLabel: string;
    itag: number;
    container: string;
    fps?: number;
  }[];
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export default function Home() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [timeFormat, setTimeFormat] = useState<'seconds' | 'hh:mm:ss'>('seconds');
  const [step, setStep] = useState<'url' | 'metadata' | 'download'>('url');

  // Debug: Log when videoInfo changes
  useEffect(() => {
    console.log('videoInfo state changed to:', videoInfo);
  }, [videoInfo]);

  const { register, handleSubmit, getValues, watch } = useForm({
    defaultValues: {
      url: '',
      startTime: '',
      endTime: ''
    }
  });

  const watchedUrl = watch('url');

  const fetchVideoInfo = async (url: string) => {
    try {
      setLoading(true);
      setError(null);
      setVideoInfo(null); // Reset video info

      const response = await fetch('/api/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error || 'Failed to fetch video info');
      }

      const data = await response.json();
      console.log('Received video info:', data);
      console.log('Setting videoInfo state to:', data);
      setVideoInfo(data);
      setStep('metadata'); // Move to metadata step
      console.log('State should now be updated');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch video information';
      setError(errorMessage);
      setStep('url'); // Stay on URL step if error
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: { url: string; startTime: string; endTime: string; }) => {
    if (!videoInfo) {
      setError('Please fetch video info first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setDownloadProgress(0);
      setStep('download');

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

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // Handle file download
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
      setStep('url'); // Reset to URL step after successful download
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      setStep('metadata'); // Go back to metadata step if download fails
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

  const isTrimmingRequested = () => {
    const startTime = getValues('startTime');
    const endTime = getValues('endTime');
    return startTime || endTime;
  };

  const resetToUrlStep = () => {
    setVideoInfo(null);
    setError(null);
    setStep('url');
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
            {/* Progress indicator */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className={`flex items-center ${step === 'url' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="ml-2">Enter URL</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center ${step === 'metadata' ? 'text-blue-600' : step === 'download' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'metadata' ? 'bg-blue-600 text-white' : step === 'download' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span className="ml-2">Set Timeframe</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center ${step === 'download' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'download' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  3
                </div>
                <span className="ml-2">Download</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Step 1: URL Input */}
              {step === 'url' && (
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Step 1:</strong> Enter a YouTube URL and click <strong>Fetch Video Info</strong> to get video details.
                    </AlertDescription>
                  </Alert>
                  
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
                        onClick={() => {
                          const url = getValues('url');
                          console.log('Fetching info for URL:', url);
                          if (!url) {
                            setError('Please enter a YouTube URL');
                            return;
                          }
                          fetchVideoInfo(url);
                        }}
                        disabled={loading || !watchedUrl}
                      >
                        {loading ? <Loader2 className="animate-spin" /> : 'Fetch Video Info'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Video Metadata and Timeframe Selection */}
              {step === 'metadata' && videoInfo && (
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Step 2:</strong> Review video details and set your desired timeframe for trimming.
                    </AlertDescription>
                  </Alert>

                  {/* Video Info Display */}
                  <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <Image
                      src={videoInfo.thumbnail}
                      alt="Video thumbnail"
                      width={160}
                      height={90}
                      className="w-40 h-auto rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{videoInfo.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Duration:</strong> {videoInfo.durationFormatted} ({videoInfo.duration} seconds)
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Available qualities:</strong> {videoInfo.availableQualities.map(q => q.qualityLabel).join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Timeframe Selection */}
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
                      <Label htmlFor="startTime">Start Time (Optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          {...register('startTime')}
                          type={timeFormat === 'seconds' ? 'number' : 'text'}
                          placeholder={timeFormat === 'seconds' ? '0' : '00:00:00'}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {timeFormat === 'seconds' ? `0 to ${videoInfo.duration}` : `00:00:00 to ${videoInfo.durationFormatted}`}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="endTime">End Time (Optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          {...register('endTime')}
                          type={timeFormat === 'seconds' ? 'number' : 'text'}
                          placeholder={timeFormat === 'seconds' ? videoInfo.duration.toString() : videoInfo.durationFormatted}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {timeFormat === 'seconds' ? `0 to ${videoInfo.duration}` : `00:00:00 to ${videoInfo.durationFormatted}`}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? (
                        <Loader2 className="animate-spin mr-2" />
                      ) : isTrimmingRequested() ? (
                        <Scissors className="mr-2" />
                      ) : (
                        <Download className="mr-2" />
                      )}
                      {isTrimmingRequested() ? 'Download & Trim Video' : 'Download Full Video'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetToUrlStep}>
                      New Video
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Download Progress */}
              {step === 'download' && (
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Step 3:</strong> Downloading your video...
                    </AlertDescription>
                  </Alert>

                  {downloadProgress !== null && downloadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing...</span>
                        <span>{Math.round(downloadProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${downloadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
      <footer className="bg-gray-800 text-white py-4 mt-auto">
        <div className="container mx-auto text-center">
          <p className="text-sm">
            &copy; {new Date().getFullYear()}. OSS.
            <br />
            Made with ❤️ by <a href="https://twitter.com/danielolabemiwo" target="_blank" rel="noopener noreferrer" className="text-blue-400">Daniel Olabemiwo</a>
          </p>
        </div>
      </footer>
    </div>
  );
}