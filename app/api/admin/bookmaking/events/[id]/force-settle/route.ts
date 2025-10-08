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

    const { id: eventId } = params
    const { winningOutcomeId } = await req.json()

    if (!winningOutcomeId) {
      return new NextResponse("Winning outcome ID is required", { status: 400 })
    }

    console.log(`🔧 FORCE SETTLING event: ${eventId}`)

    // Get current state
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        outcomes: true,
        bets: {
          include: {
            transaction: true
          }
        }
      }
    })

    if (!event) {
      return new NextResponse("Event not found", { status: 404 })
    }

    const winningOutcome = event.outcomes.find(o => o.id === winningOutcomeId)
    if (!winningOutcome) {
      return new NextResponse("Winning outcome not found", { status: 400 })
    }

    console.log(`📊 Current state - Bets: ${event.bets.length}, Event status: ${event.status}`)

    // Force update everything
    const result = await db.$transaction(async (tx) => {
      // 1. Update all bets
      const updatePromises = event.bets.map(bet => {
        const isWinner = bet.outcomeId === winningOutcomeId
        const newStatus = isWinner ? 'WON' : 'LOST'
        
        console.log(`   Updating bet ${bet.id} to ${newStatus}`)

        const betUpdate = tx.bet.update({
          where: { id: bet.id },
          data: {
            status: newStatus,
            settledAt: new Date()
          }
        })

        let transactionUpdate = Promise.resolve()
        if (bet.transaction) {
          const newTxStatus = isWinner ? 'success' : 'fail'
          console.log(`   Updating transaction ${bet.transaction.id} to ${newTxStatus}`)
          
          const transactionUpdate = tx.transaction.update({
            where: { id: bet.transaction.id },
            data: {
              status: newTxStatus,
              description: `${newStatus}: ${event.name}`
            }
          })
        }

        return Promise.all([betUpdate, transactionUpdate])
      })

      await Promise.all(updatePromises)

      // 2. Update event
      await tx.event.update({
        where: { id: eventId },
        data: { status: 'COMPLETED' }
      })

      // 3. Update outcomes
      await tx.outcome.update({
        where: { id: winningOutcomeId },
        data: { result: 'WIN' }
      })

      await tx.outcome.updateMany({
        where: { 
          eventId: eventId,
          id: { not: winningOutcomeId }
        },
        data: { result: 'LOSE' }
      })

      return { updatedBets: event.bets.length }
    })

    console.log(`✅ FORCE SETTLEMENT COMPLETED: ${result.updatedBets} bets updated`)

    return NextResponse.json({
      success: true,
      message: 'Force settlement completed',
      data: result
    })

  } catch (error: any) {
    console.error('❌ FORCE SETTLEMENT ERROR:', error)
    return new NextResponse(
      `Force settlement failed: ${error.message || 'Unknown error'}`,
      { status: 500 }
    )
  }
}