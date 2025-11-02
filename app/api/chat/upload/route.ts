// app/api/chat/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { uploadChatImage, validateChatImage } from '@/lib/chat-upload';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (user.isChatBlocked) {
      return NextResponse.json(
        { error: 'Chat access blocked' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file before upload
    const validation = validateChatImage(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const imageUrl = await uploadChatImage(file);

    return NextResponse.json({ 
      imageUrl 
    });

  } catch (error: any) {
    console.error('Chat upload error:', error);
    
    // Always return JSON, even for errors
    let errorMessage = 'Upload failed';
    let statusCode = 500;

    if (error.message.includes('Invalid file type')) {
      errorMessage = 'Invalid file type';
      statusCode = 400;
    } else if (error.message.includes('File size too large')) {
      errorMessage = 'File too large';
      statusCode = 400;
    } else if (error.message.includes('token') || error.message.includes('auth') || error.message.includes('Storage')) {
      errorMessage = 'Storage configuration error - please check server setup';
      statusCode = 500;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}