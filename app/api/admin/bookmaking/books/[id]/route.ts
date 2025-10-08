import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { currentUser } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const { title, date, events, teams } = await req.json()

    // Validate input
    if (!title || !date || !teams || !events) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (teams.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 teams are required' },
        { status: 400 }
      )
    }

    if (events.length === 0) {
      return NextResponse.json(
        { error: 'At least one event is required' },
        { status: 400 }
      )
    }

    // Check if book exists and belongs to user
    const existingBook = await db.book.findUnique({
      where: { id, userId: user.id }
    })

    if (!existingBook) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    const result = await db.$transaction(async (tx) => {
      // Update book
      const updatedBook = await tx.book.update({
        where: { id },
        data: {
          title,
          date: new Date(date),
        }
      })

      // Delete existing teams and events (cascade will handle related records)
      await tx.team.deleteMany({ where: { bookId: id } })
      await tx.event.deleteMany({ where: { bookId: id } })

      // Create new teams
      const createdTeams = await Promise.all(
        teams.map((team: any) =>
          tx.team.create({
            data: {
              name: team.name,
              image: team.image || null,
              bookId: id,
            }
          })
        )
      )

      // Create new events with outcomes
      const createdEvents = await Promise.all(
        events.map(async (event: any) => {
          return tx.event.create({
            data: {
              name: event.name,
              isFirstFastOption: event.isFirstFastOption || false,
              isSecondFastOption: event.isSecondFastOption || false,
              bookId: id,
              outcomes: {
                create: event.outcomes.map((outcome: any) => ({
                  name: outcome.name,
                  odds: parseFloat(outcome.odds) || 1.0,
                  probability: 1 / (parseFloat(outcome.odds) || 1.0),
                  stake: 0
                }))
              }
            },
            include: {
              outcomes: true
            }
          })
        })
      )

      return {
        book: updatedBook,
        teams: createdTeams,
        events: createdEvents
      }
    })

    return NextResponse.json(result.book)
  } catch (error: any) {
    console.error('💥 [ADMIN_BOOKS_PUT] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}