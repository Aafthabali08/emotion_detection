// app/api/hello/route.ts

// THIS LINE ELIMINATES COLD STARTS ON VERCEL
export const runtime = 'edge';

export async function GET(request: Request) {
  // Simulating an incredibly fast edge response
  const data = { 
    message: "Hello from the ultra-fast Edge network!",
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Edge Caching: Cache for 60 seconds on the Vercel CDN
      'Cache-Control': 's-maxage=60, stale-while-revalidate',
    },
  });
}
