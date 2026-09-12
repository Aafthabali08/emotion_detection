'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState<{ message: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchTime, setFetchTime] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const start = performance.now();
      try {
        // In production, you would replace this with your actual Render URL
        // Example: await fetch('https://face-detection-backend.onrender.com/api/hello');
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
        const response = await fetch(`${BACKEND_URL}/api/hello`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        const end = performance.now();
        setFetchTime(Math.round(end - start));
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-black text-white font-sans">
      <main className="flex flex-col gap-8 items-center text-center max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight">Vercel + Render Demo</h1>
        
        <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-950 w-full text-left shadow-2xl">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Render Backend Response</h2>
          
          {loading ? (
            <p className="text-zinc-400 animate-pulse">Fetching from Render backend...</p>
          ) : data ? (
            <div className="space-y-6">
              <p className="text-2xl font-medium text-emerald-400">"{data.message}"</p>
              <div className="text-sm text-zinc-500 font-mono space-y-2 bg-zinc-900 p-4 rounded-lg">
                <p>Status: <span className="text-zinc-300">{data.status}</span></p>
                <p>Network Latency: <span className="text-emerald-400 font-bold">{fetchTime}ms</span></p>
              </div>
            </div>
          ) : (
            <p className="text-red-500">Failed to load data from backend</p>
          )}
        </div>

        <div className="text-zinc-400 max-w-lg mt-4 space-y-4 text-left">
          <p>
            ✅ This frontend lives on <strong>Vercel</strong> for fast, global delivery.
          </p>
          <p>
            ✅ The backend is an Express server running on <strong>Render</strong>, giving you a traditional always-on container.
          </p>
          <p>
            ✅ This split architecture is perfect for heavy tasks like Face Detection, allowing you to bypass Vercel's 50MB function limits!
          </p>
        </div>
      </main>
    </div>
  );
}
