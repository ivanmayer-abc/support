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

    console.log(`🎯 Starting settlement for event: ${eventId}`)
    console.log(`🏆 Winning outcome: ${winningOutcomeId}`)

    // Use transaction to ensure all operations succeed or fail together
    const result = await db.$transaction(async (tx) => {
      // 1. Get the event with ALL related data
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: {
          outcomes: true,
          bets: {
            include: {
              outcome: true,
              user: {
                select: { id: true, name: true, email: true }
              },
              transaction: true // Include the linked transaction
            }
          },
          book: true
        }
      })

      if (!event) {
        throw new Error('Event not found')
      }

      // Verify the winning outcome belongs to this event
      const winningOutcome = event.outcomes.find(o => o.id === winningOutcomeId)
      if (!winningOutcome) {
        throw new Error('Winning outcome not found in this event')
      }

      console.log(`📊 Found ${event.bets.length} bets for event`)
      console.log(`📊 Event outcomes:`, event.outcomes.map(o => ({ id: o.id, name: o.name, result: o.result })))

      let wonBets = 0
      let lostBets = 0
      let updatedTransactions = 0

      // 2. Process each bet in the event
      for (const bet of event.bets) {
        console.log(`\n🎰 Processing bet ${bet.id}:`)
        console.log(`   - User: ${bet.user.name}`)
        console.log(`   - Outcome: ${bet.outcome.name} (${bet.outcome.id})`)
        console.log(`   - Current status: ${bet.status}`)
        console.log(`   - Winning outcome: ${winningOutcome.name} (${winningOutcome.id})`)

        const isWinner = bet.outcomeId === winningOutcomeId
        const newStatus = isWinner ? 'WON' : 'LOST'

        console.log(`   - Result: ${newStatus} (isWinner: ${isWinner})`)

        // Update the bet status
        const updatedBet = await tx.bet.update({
          where: { id: bet.id },
          data: {
            status: newStatus,
            settledAt: new Date()
          }
        })

        console.log(`   ✅ Bet ${bet.id} updated to ${newStatus}`)

        // Update the associated transaction if it exists
        if (bet.transaction) {
          console.log(`   📝 Found transaction ${bet.transaction.id} with status: ${bet.transaction.status}`)
          
          if (isWinner) {
            // Update to SUCCESS for winners
            await tx.transaction.update({
              where: { id: bet.transaction.id },
              data: {
                status: 'success',
                description: `WON: ${event.name} - ${bet.outcome.name}`
              }
            })
            console.log(`   💰 Transaction ${bet.transaction.id} updated to SUCCESS`)
            updatedTransactions++
          } else {
            // Update to FAIL for losers
            await tx.transaction.update({
              where: { id: bet.transaction.id },
              data: {
                status: 'fail',
                description: `LOST: ${event.name} - ${bet.outcome.name}`
              }
            })
            console.log(`   ❌ Transaction ${bet.transaction.id} updated to FAIL`)
            updatedTransactions++
          }
        } else {
          console.log(`   ⚠️ No transaction linked to bet ${bet.id}`)
          
          // Create a transaction if one doesn't exist (backward compatibility)
          if (isWinner) {
            const newTransaction = await tx.transaction.create({
              data: {
                userId: bet.userId,
                type: 'deposit',
                amount: bet.potentialWin,
                status: 'success',
                description: `WON (manual): ${event.name} - ${bet.outcome.name}`,
                category: 'betting-winnings'
              }
            })
            
            // Link the transaction to the bet
            await tx.bet.update({
              where: { id: bet.id },
              data: { transactionId: newTransaction.id }
            })
            console.log(`   💰 Created new transaction ${newTransaction.id} for winner`)
            updatedTransactions++
          }
        }

        if (isWinner) wonBets++
        else lostBets++
      }

      // 3. Update event status to COMPLETED
      await tx.event.update({
        where: { id: eventId },
        data: { status: 'COMPLETED' }
      })
      console.log(`✅ Event ${eventId} marked as COMPLETED`)

      // 4. Update outcome results
      await tx.outcome.update({
        where: { id: winningOutcomeId },
        data: { result: 'WIN' }
      })
      console.log(`✅ Winning outcome ${winningOutcomeId} marked as WIN`)

      await tx.outcome.updateMany({
        where: { 
          eventId: eventId,
          id: { not: winningOutcomeId }
        },
        data: { result: 'LOSE' }
      })
      console.log(`✅ Other outcomes marked as LOSE`)

      return {
        eventId,
        totalBets: event.bets.length,
        wonBets,
        lostBets,
        updatedTransactions,
        winningOutcome: winningOutcome.name
      }
    })

    console.log(`\n🏁 SETTLEMENT COMPLETED SUCCESSFULLY:`, result)

    return NextResponse.json({
      success: true,
      message: 'Bets settled successfully',
      data: result
    })

  } catch (error: any) {
    console.error('\n❌ SETTLEMENT ERROR:', error)
    
    if (error.message === 'Event not found') {
      return new NextResponse("Event not found", { status: 404 })
    }
    if (error.message === 'Winning outcome not found in this event') {
      return new NextResponse("Winning outcome not found in this event", { status: 400 })
    }

    return new NextResponse(
      `Settlement failed: ${error.message || 'Unknown error'}`,
      { status: 500 }
    )
  }
}