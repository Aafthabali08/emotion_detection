'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, CameraOff, Play, Square, ZoomIn, ZoomOut, Check, X, Activity, MessageSquareText, BrainCircuit } from 'lucide-react';

interface FaceResult {
  box: { x: number; y: number; width: number; height: number };
  dominantEmotion: string;
  allEmotions: Record<string, number>;
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

const EMOTIONS_LIST = ['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'neutral'];

export default function Home() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faces, setFaces] = useState<FaceResult[]>([]);
  const [zoom, setZoom] = useState(1);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isLearning, setIsLearning] = useState(false);

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
          
          // Draw rectangular shape block (White border as requested)
          ctx.strokeStyle = '#ffffff'; 
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, width, height);
          
          // Draw emotion with emoji above box (White background)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y - 40, width, 40);
          
          // Black text for high contrast on white background
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(`${emoji} ${face.dominantEmotion.toUpperCase()}`, x + 10, y - 10);
        });
      }
    }
  }, [faces]);

  const primaryFace = faces.length > 0 ? faces[0] : null;
  const primaryEmotion = primaryFace?.dominantEmotion;
  const primaryEmoji = primaryEmotion ? EMOTION_EMOJIS[primaryEmotion] : null;

  // Generate Live Analysis Summary
  let liveAnalysisText = "Waiting for face...";
  if (primaryFace) {
    const sortedEmotions = Object.entries(primaryFace.allEmotions)
      .sort(([, a], [, b]) => b - a);
    
    const [highestEmotion, highestScore] = sortedEmotions[0];
    const [secondEmotion, secondScore] = sortedEmotions[1];

    if (highestScore < 0.2) {
      liveAnalysisText = "No strong emotion detected.";
    } else if (secondScore >= 0.2) {
      liveAnalysisText = `Mixed Reaction: ${highestEmotion} + ${secondEmotion}`;
    } else {
      liveAnalysisText = `Clear Emotion: ${highestEmotion}`;
    }
  }

  // Handle Feedback (Continuous Learning)
  const handleFeedback = async (status: 'accepted' | 'rejected') => {
    if (!primaryEmotion || !webcamRef.current) return;
    
    const imageBase64 = webcamRef.current.getScreenshot();
    if (!imageBase64) return;

    setIsLearning(true);
    setFeedbackMsg(`Recording ${status} insight...`);

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          predictedEmotion: primaryEmotion,
          status
        })
      });

      if (status === 'accepted') {
        setFeedbackMsg('Dataset Updated: Reinforced ✅');
      } else {
        setFeedbackMsg('Dataset Updated: Flagged mistake ❌');
      }
    } catch (error) {
      setFeedbackMsg('Error saving insight');
    } finally {
      setTimeout(() => setFeedbackMsg(''), 3000);
      setIsLearning(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-zinc-950 text-white font-sans">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        
        <header className="flex justify-between items-center bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-lg">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-white" />
            EmotionAI
          </h1>
          
          <div className="flex gap-3">
            <button 
              onClick={() => { setIsCameraOn(!isCameraOn); if(isCameraOn) setIsDetecting(false); }}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold transition-all ${
                isCameraOn 
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                  : 'bg-white text-black hover:bg-zinc-200 shadow-lg'
              }`}
            >
              {isCameraOn ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
              {isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            </button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Main Camera Area */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-2xl flex items-center justify-center">
              
              {isCameraOn ? (
                <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                  <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.3s ease-out' }} className="relative w-full h-full origin-center">
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
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white backdrop-blur-xl rounded-full px-6 py-2 flex items-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.2)] animate-in fade-in slide-in-from-top-4">
                      <span className="text-3xl drop-shadow-md">{primaryEmoji}</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Current Mood</span>
                        <span className="text-xl font-black capitalize text-black leading-tight">{primaryEmotion}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Overlay */}
                  {!isDetecting ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <button 
                        onClick={() => setIsDetecting(true)}
                        className="flex items-center gap-3 bg-white hover:bg-zinc-200 text-black px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                      >
                        <Play className="w-6 h-6 fill-current" />
                        Start Emotion Tracking
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsDetecting(false)}
                      className="absolute bottom-6 right-6 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Stop
                    </button>
                  )}
                </div>
              ) : (
                 <div className="text-zinc-600 flex flex-col items-center gap-4">
                  <CameraOff className="w-16 h-16 opacity-50" />
                  <p className="text-lg font-medium">Camera is turned off</p>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-lg">
              
              {/* Zoom Controls */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">Zoom</span>
                <button 
                  disabled={!isCameraOn || zoom <= 1}
                  onClick={() => setZoom(prev => Math.max(1, prev - 0.2))}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 rounded-xl transition-colors text-white"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="font-mono text-sm w-12 text-center text-zinc-300 font-bold">{Math.round(zoom * 100)}%</span>
                <button 
                  disabled={!isCameraOn || zoom >= 3}
                  onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 rounded-xl transition-colors text-white"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>

              {/* Feedback Loop: Accept / Reject */}
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold mr-2 transition-opacity ${feedbackMsg ? 'opacity-100' : 'opacity-0'} ${feedbackMsg.includes('❌') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {feedbackMsg}
                </span>
                
                <button 
                  disabled={!primaryEmotion || isLearning}
                  onClick={() => handleFeedback('rejected')}
                  className="flex items-center gap-2 bg-zinc-950 hover:bg-red-500/20 border border-zinc-800 hover:border-red-500/50 hover:text-red-400 text-zinc-400 disabled:opacity-30 px-5 py-2.5 rounded-xl font-bold transition-all"
                >
                  <X className="w-4 h-4" />
                  Mistake (Reject)
                </button>
                
                <button 
                  disabled={!primaryEmotion || isLearning}
                  onClick={() => handleFeedback('accepted')}
                  className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black disabled:opacity-30 px-5 py-2.5 rounded-xl font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all"
                >
                  <Check className="w-4 h-4" />
                  Correct (Accept)
                </button>
              </div>

            </div>
          </div>

          {/* Right Side Panel - All 7 Emotions Dashboard */}
          <div className="w-full lg:w-80 flex flex-col gap-4">
            <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-xl flex-1 flex flex-col relative overflow-hidden">
              
              {/* Continuous Learning Badge */}
              <div className="absolute top-0 right-0 bg-white text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                <BrainCircuit className="w-3 h-3" />
                Learning Mode
              </div>

              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 shrink-0">
                <Activity className="w-5 h-5 text-white" />
                Emotion Analysis
              </h2>
              
              {!primaryFace ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4 pb-12">
                  <span className="text-6xl opacity-20">🎭</span>
                  <p className="text-sm text-center">Turn on tracking to<br/>see all 7 emotions live</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5 h-full">
                  
                  {/* Live Analysis Summary */}
                  <div className="bg-zinc-950 border border-white/20 rounded-xl p-4 flex items-start gap-3 shadow-lg">
                    <MessageSquareText className="w-5 h-5 text-white shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Live AI Analysis</p>
                      <p className="text-sm text-white leading-snug font-medium capitalize">{liveAnalysisText}</p>
                    </div>
                  </div>

                  <hr className="border-zinc-800 my-1" />

                  {/* Progress Bars */}
                  <div className="flex flex-col gap-4 flex-1">
                    {EMOTIONS_LIST.map(emotion => {
                      const score = primaryFace.allEmotions[emotion] || 0;
                      const percentage = Math.round(score * 100);
                      const isDominant = emotion === primaryEmotion;
                      
                      return (
                        <div key={emotion} className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-end">
                            <span className={`text-sm font-bold flex items-center gap-2 ${isDominant ? 'text-white' : 'text-zinc-400'}`}>
                              <span className="text-xl">{EMOTION_EMOJIS[emotion]}</span>
                              <span className="capitalize">{emotion}</span>
                            </span>
                            <span className={`text-xs font-mono font-bold ${isDominant ? 'text-white' : 'text-zinc-500'}`}>
                              {percentage}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ease-out ${isDominant ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'bg-zinc-700'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
