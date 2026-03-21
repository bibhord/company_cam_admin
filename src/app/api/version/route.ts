import { NextResponse } from 'next/server';

// This value is set at build time by Vercel.
// Every new deployment gets a unique ID, so comparing it
// tells the client whether a new version is live.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8)
  || process.env.NEXT_BUILD_ID
  || Date.now().toString();

export async function GET() {
  return NextResponse.json(
    { version: BUILD_ID },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
