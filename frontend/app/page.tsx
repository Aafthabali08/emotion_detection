'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, CameraOff, Play, Square, ZoomIn, ZoomOut, Check, X } from 'lucide-react';

interface FaceResult {
  box: { x: number; y: number; width: number; height: number };
  dominantEmotion: string;
}

const EMOTION_EMOJIS: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  fearful: '😨',
  disgusted: '🤢',
  surprised: '😲',
  neutral: '😐'
};

export default function Home() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faces, setFaces] = useState<FaceResult[]>([]);
  const [zoom, setZoom] = useState(1);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const captureAndDetect = useCallback(async () => {
    if (!webcamRef.current || !isDetecting) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
      const response = await fetch(`${BACKEND_URL}/api/detect`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.faces) {
        setFaces(data.faces);
      }
    } catch (error) {
      console.error('Detection error:', error);
    }
  }, [isDetecting]);

  // Detection loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDetecting && isCameraOn) {
      interval = setInterval(() => {
        captureAndDetect();
      }, 1000);
    } else {
      setFaces([]);
    }
    return () => clearInterval(interval);
  }, [isDetecting, isCameraOn, captureAndDetect]);

  // Draw bounding boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    
    if (canvas && video) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        faces.forEach(face => {
          const { x, y, width, height } = face.box;
          const emoji = EMOTION_EMOJIS[face.dominantEmotion] || '😐';
          
          // Draw rectangular shape block
          ctx.strokeStyle = '#3b82f6'; // blue-500
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, width, height);
          
          // Draw emotion with emoji above box
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(x, y - 40, width, 40);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '24px sans-serif';
          ctx.fillText(`${emoji} ${face.dominantEmotion.toUpperCase()}`, x + 10, y - 10);
        });
      }
    }
  }, [faces]);

  const primaryEmotion = faces.length > 0 ? faces[0].dominantEmotion : null;
  const primaryEmoji = primaryEmotion ? EMOTION_EMOJIS[primaryEmotion] : null;

  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-zinc-950 text-white font-sans">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        
        <header className="flex justify-between items-center bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
          <h1 className="text-2xl font-bold">EmotionAI</h1>
          
          <div className="flex gap-3">
            <button 
              onClick={() => { setIsCameraOn(!isCameraOn); if(isCameraOn) setIsDetecting(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                isCameraOn ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
              }`}
            >
              {isCameraOn ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
              {isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            </button>
          </div>
        </header>

        {/* Main Camera Area */}
        <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-2xl flex items-center justify-center">
          
          {isCameraOn ? (
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
              <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.3s ease-out' }} className="relative w-full h-full">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none object-cover"
                />
              </div>

              {/* Emoji Rating Capsule */}
              {primaryEmotion && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-top-4">
                  <span className="text-3xl">{primaryEmoji}</span>
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Current Mood</span>
                    <span className="text-lg font-bold capitalize text-white">{primaryEmotion}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons Overlay */}
              {!isDetecting ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <button 
                    onClick={() => setIsDetecting(true)}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 shadow-blue-500/50 shadow-lg"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    Start Emotion Tracking
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsDetecting(false)}
                  className="absolute bottom-6 right-6 flex items-center gap-2 bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-full font-medium backdrop-blur-md transition-colors"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop
                </button>
              )}
            </div>
          ) : (
            <div className="text-zinc-600 flex flex-col items-center gap-4">
              <CameraOff className="w-16 h-16" />
              <p className="text-lg font-medium">Camera is turned off</p>
            </div>
          )}
        </div>

        {/* Bottom Controls Bar */}
        <div className="grid grid-cols-3 gap-4 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mr-2">Zoom</span>
            <button 
              disabled={!isCameraOn || zoom <= 1}
              onClick={() => setZoom(prev => Math.max(1, prev - 0.2))}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="font-mono w-12 text-center text-zinc-300">{Math.round(zoom * 100)}%</span>
            <button 
              disabled={!isCameraOn || zoom >= 3}
              onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* Accept / Reject */}
          <div className="col-span-2 flex items-center justify-end gap-3">
            <span className="text-sm text-zinc-400 mr-2">{feedbackMsg}</span>
            <button 
              onClick={() => { setFeedbackMsg('Feedback Rejected ❌'); setTimeout(() => setFeedbackMsg(''), 2000); }}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-300 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <X className="w-5 h-5" />
              Reject
            </button>
            <button 
              onClick={() => { setFeedbackMsg('Feedback Accepted ✅'); setTimeout(() => setFeedbackMsg(''), 2000); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <Check className="w-5 h-5" />
              Accept
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
