import { NextRequest } from 'next/server';

// Store connected clients
const clients = new Set<() => void>();

export async function GET(request: NextRequest) {
  // Set up Server-Sent Events response
  const stream = new ReadableStream({
    start(controller) {
      // Add this client to the set
      const closeConnection = () => {
        clients.delete(closeConnection);
        controller.close();
      };
      
      clients.add(closeConnection);
      
      // Send initial data
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('data: connected\n\n'));
      
      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        closeConnection();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Function to broadcast game state to all connected clients
export function broadcastGameState(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  clients.forEach((closeConnection) => {
    // In a real implementation, you'd send the message to each client
    // For simplicity, we'll handle this in the game server
  });
}

export const dynamic = 'force-dynamic';