import { NextResponse } from 'next/server';
import { autoSettlementService } from '@/lib/auto-settlement-service';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕒 Running scheduled auto-settlement...');
    await autoSettlementService.checkAndSettleCompletedBooks();

    return NextResponse.json({
      success: true,
      message: 'Scheduled auto-settlement completed'
    });

  } catch (error: any) {
    console.error('Error in scheduled auto-settlement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}