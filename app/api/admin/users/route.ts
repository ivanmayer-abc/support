import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100');

    const whereClause: any = {
      role: 'USER'
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        isChatBlocked: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    const validUsers = users
      .filter(user => user.id && (user.name || user.email))
      .map(user => ({
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email || 'No email',
        role: user.role,
        isBlocked: user.isBlocked,
        isChatBlocked: user.isChatBlocked,
        createdAt: user.createdAt,
      }));

    return NextResponse.json({
      users: validUsers,
    });
  } catch (error) {
    console.error('[ADMIN_USERS_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}