'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw } from 'lucide-react';

interface FaceResult {
  box: { x: number; y: number; width: number; height: number };
  dominantEmotion: string;
}

export default function Home() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faces, setFaces] = useState<FaceResult[]>([]);
  const [videoConstraints, setVideoConstraints] = useState({
    width: 640,
    height: 480,
    facingMode: "user"
  });

  const captureAndDetect = useCallback(async () => {
    if (!webcamRef.current) return;
    
    // Get screenshot as base64 string
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    // Convert base64 to blob
    const res = await fetch(imageSrc);
    const blob = await res.blob();

    // Create form data
    const formData = new FormData();
    formData.append('image', blob, 'frame.jpg');

    try {
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
  }, []);

  // Set up the detection loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDetecting) {
      // Run detection every 1000ms to avoid overloading network/backend
      interval = setInterval(() => {
        captureAndDetect();
      }, 1000);
    } else {
      setFaces([]); // Clear boxes when stopped
    }
    return () => clearInterval(interval);
  }, [isDetecting, captureAndDetect]);

  // Draw bounding boxes when faces change
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    
    if (canvas && video) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Match canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw new boxes
        faces.forEach(face => {
          const { x, y, width, height } = face.box;
          
          // Draw box
          ctx.strokeStyle = '#10b981'; // emerald-500
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);
          
          // Draw emotion text background
          ctx.fillStyle = '#10b981';
          ctx.fillRect(x, y - 30, width, 30);
          
          // Draw emotion text
          ctx.fillStyle = '#ffffff';
          ctx.font = '20px sans-serif';
          ctx.fillText(
            face.dominantEmotion.toUpperCase(), 
            x + 5, 
            y - 8
          );
        });
      }
    }
  }, [faces]);

  return (
    <div className="flex flex-col items-center min-h-screen p-8 bg-zinc-950 text-white font-sans">
      <main className="flex flex-col gap-6 items-center w-full max-w-4xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Real-Time Emotion Detection</h1>
          <p className="text-zinc-400">Powered by Next.js, Vercel, and Render</p>
        </div>
        
        <div className="relative w-full max-w-2xl bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="w-full h-auto"
            onUserMedia={() => console.log('Camera loaded')}
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
          
          {!isDetecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <button 
                onClick={() => setIsDetecting(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full font-medium transition-all transform hover:scale-105"
              >
                <Camera className="w-5 h-5" />
                Start Detection
              </button>
            </div>
          )}
        </div>

        {isDetecting && (
          <button 
            onClick={() => setIsDetecting(false)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white px-4 py-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Stop Detection
          </button>
        )}
        
        {isDetecting && faces.length === 0 && (
          <p className="text-emerald-400 animate-pulse text-sm">
            Scanning for faces...
          </p>
        )}
      </main>
    </div>
  );
}
