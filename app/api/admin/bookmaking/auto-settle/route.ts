import { NextResponse } from 'next/server';
import { autoSettlementService } from '@/lib/auto-settlement-service';
import { currentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Trigger auto-settlement check
    await autoSettlementService.checkAndSettleCompletedBooks();

    return NextResponse.json({
      success: true,
      message: 'Auto-settlement check completed'
    });

  } catch (error: any) {
    console.error('Error in auto-settlement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return status of auto-settlement service
    return NextResponse.json({
      success: true,
      message: 'Auto-settlement service is running',
      lastRun: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error checking auto-settlement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}