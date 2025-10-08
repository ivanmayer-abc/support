import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { currentUser } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await currentUser()
    if (!user?.id) return new NextResponse("Unauthorized", { status: 401 })

    const { id: betId } = params
    const { result } = await req.json() // 'WON' or 'LOST'

    if (!['WON', 'LOST'].includes(result)) {
      return new NextResponse("Invalid result. Must be 'WON' or 'LOST'", { status: 400 })
    }

    console.log(`🔧 Manually settling bet ${betId} as ${result}`)

    const bet = await db.bet.findUnique({
      where: { id: betId },
      include: {
        outcome: {
          include: {
            event: true
          }
        },
        user: true
      }
    })

    if (!bet) {
      return new NextResponse("Bet not found", { status: 404 })
    }

    if (bet.status !== 'PENDING') {
      return new NextResponse(`Bet is already ${bet.status}`, { status: 400 })
    }

    // Use transaction for atomic operations
    await db.$transaction(async (tx) => {
      // Update bet status
      await tx.bet.update({
        where: { id: betId },
        data: {
          status: result,
          settledAt: new Date()
        }
      })

      console.log(`✅ Bet ${betId} updated to ${result}`)

      // Create transaction for winning bets
      if (result === 'WON') {
        console.log(`💰 Creating winning transaction: ₹${bet.potentialWin}`)
        
        await tx.transaction.create({
          data: {
            userId: bet.userId,
            type: 'deposit',
            amount: bet.potentialWin,
            status: 'success',
            description: `Manual settlement: Bet won on ${bet.outcome.event.name}`,
            category: 'betting-winnings'
          }
        })
        
        console.log(`🎉 Transaction created for user ${bet.userId}`)
      }
    })

    return NextResponse.json({
      success: true,
      message: `Bet ${result.toLowerCase()} successfully`,
      betId,
      result
    })

  } catch (error: any) {
    console.error('❌ MANUAL SETTLEMENT ERROR:', error)
    return new NextResponse(
      `Manual settlement failed: ${error.message || 'Unknown error'}`,
      { status: 500 }
    )
  }
}