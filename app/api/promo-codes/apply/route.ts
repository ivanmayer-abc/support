import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { code } = await req.json();

    if (!code) {
      return new NextResponse("Promo code is required", { status: 400 });
    }

    // Check if user already has a promo code
    const existingUserPromoCode = await db.userPromoCode.findFirst({
      where: { userId: user.id },
      include: { promoCode: true }
    });

    if (existingUserPromoCode) {
      return new NextResponse("You have already used a promo code on this account", { status: 400 });
    }

    // Start transaction
    const result = await db.$transaction(async (tx) => {
      // Validate and lock promo code
      const promoCode = await tx.promoCode.findFirst({
        where: {
          code: code.toUpperCase(),
          status: 'ACTIVE',
          startDate: { lte: new Date() },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        }
      });

      if (!promoCode) {
        throw new Error("Invalid or expired promo code");
      }

      // Check if promo code is one-time use and user already used it
      if (promoCode.isOneTimeUse) {
        const userUsed = await tx.userPromoCode.findFirst({
          where: { userId: user.id, promoCodeId: promoCode.id }
        });
        if (userUsed) {
          throw new Error("You have already used this promo code");
        }
      }

      // Check max uses
      if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
        throw new Error("Promo code has reached maximum uses");
      }

      // Create user promo code record
      const userPromoCode = await tx.userPromoCode.create({
        data: {
          userId: user.id,
          promoCodeId: promoCode.id,
          timesUsed: 1,
          lastUsedAt: new Date()
        }
      });

      // Update promo code uses
      await tx.promoCode.update({
        where: { id: promoCode.id },
        data: { currentUses: { increment: 1 } }
      });

      // Create bonus record based on promo code type
      let bonusData: any = {
        userId: user.id,
        promoCodeId: promoCode.id,
        amount: 0,
        bonusAmount: 0,
        remainingAmount: 0,
        wageringRequirement: 0,
        type: promoCode.type,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      switch (promoCode.type) {
        case 'FREE_SPINS':
          bonusData = {
            ...bonusData,
            freeSpinsCount: promoCode.freeSpinsCount,
            freeSpinsGame: promoCode.freeSpinsGame,
            freeSpinsUsed: 0,
            freeSpinsWinnings: 0
          };
          break;
        case 'DEPOSIT_BONUS':
          // This will be applied when user makes a deposit
          break;
      }

      const bonus = await tx.bonus.create({
        data: bonusData
      });

      return { promoCode, bonus, userPromoCode };
    });

    return NextResponse.json({
      success: true,
      bonus: result.bonus,
      message: `Promo code applied successfully! ${result.promoCode.description}`
    });

  } catch (error: any) {
    console.log('[PROMO_CODE_APPLY]', error);
    return new NextResponse(error.message || "Internal error", { status: 400 });
  }
}