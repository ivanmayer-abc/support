// src/app/api/admin/bookmaking/outcomes/[id]/result/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { currentUser } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const user = await currentUser()
    if (!user?.id) return new NextResponse("Unauthorized", { status: 401 })

    const { id: outcomeId } = params
    const { result } = await req.json()

    // Validate result
    const validResults = ['WIN', 'LOSE', 'VOID', 'PENDING']
    if (!validResults.includes(result)) {
      return new NextResponse("Invalid result", { status: 400 })
    }

    // Verify the outcome exists and user has permission
    const outcome = await db.outcome.findFirst({
      where: {
        id: outcomeId,
        event: {
          book: {
            userId: user.id // Ensure user owns the book
          }
        }
      },
      include: {
        event: {
          include: {
            book: true
          }
        }
      }
    })

    if (!outcome) {
      return new NextResponse("Outcome not found", { status: 404 })
    }

    // Update the outcome result
    const updatedOutcome = await db.outcome.update({
      where: { id: outcomeId },
      data: { result }
    })

    console.log(`Outcome ${outcomeId} result updated to: ${result}`)

    return NextResponse.json(updatedOutcome)
  } catch (error) {
    console.error('[OUTCOME_RESULT_PATCH]', error)
    return new NextResponse("Internal error", { status: 500 })
  }
}