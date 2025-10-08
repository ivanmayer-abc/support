import { NextRequest, NextResponse } from 'next/server';
import gameServer from '@/app/(games)/instant/aviator/game-server';

export async function GET(request: NextRequest) {
  try {
    const gameState = gameServer.getGameState();
    
    // Prevent caching
    const response = NextResponse.json(gameState);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get game state' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';