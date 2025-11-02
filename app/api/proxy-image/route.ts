import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3000';
    const adminApiKey = process.env.ADMIN_API_KEY;
    
    const response = await fetch(`${mainAppUrl}/api/admin/images/${filename}`, {
      headers: {
        'x-api-key': adminApiKey || ''
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch image: ${response.status} - ${errorText}`);
    }

    const imageData = await response.blob();
    
    return new NextResponse(imageData, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Proxy image error:', error);
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 });
  }
}