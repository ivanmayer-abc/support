import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { currentUser } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { title, date, events, teams, category, image } = await req.json()

    console.log('📦 Received data:', { title, date, events, teams })

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    if (!teams || teams.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 teams are required' },
        { status: 400 }
      )
    }

    if (!events || events.length === 0) {
      return NextResponse.json(
        { error: 'At least one event is required' },
        { status: 400 }
      )
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    // Validate fast bet selections
    const firstFastBetCount = events.filter((event: any) => event.isFirstFastOption).length
    const secondFastBetCount = events.filter((event: any) => event.isSecondFastOption).length

    if (firstFastBetCount > 1) {
      return NextResponse.json(
        { error: 'Only one event can be selected as 1st Fast Bet' },
        { status: 400 }
      )
    }

    if (secondFastBetCount > 1) {
      return NextResponse.json(
        { error: 'Only one event can be selected as 2nd Fast Bet' },
        { status: 400 }
      )
    }

    // Create the book with teams and events in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create the book first
      const book = await tx.book.create({
        data: {
          title,
          date: new Date(date),
          category,
          image: image || null,
          userId: user.id,
        }
      })

      console.log('📚 Book created:', book.id)

      // 2. Create teams for this book
      const createdTeams = await Promise.all(
        teams.map((team: any) =>
          tx.team.create({
            data: {
              name: team.name,
              image: team.image || null,
              bookId: book.id,
            }
          })
        )
      )

      console.log('🏈 Teams created:', createdTeams.length)

      // 3. Create events with outcomes
      const createdEvents = await Promise.all(
        events.map(async (event: any) => {
          return tx.event.create({
            data: {
              name: event.name,
              isFirstFastOption: event.isFirstFastOption || false,
              isSecondFastOption: event.isSecondFastOption || false,
              bookId: book.id,
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

      console.log('🎯 Events created:', createdEvents.length)

      return {
        book,
        teams: createdTeams,
        events: createdEvents
      }
    })

    return NextResponse.json(result.book)
  } catch (error: any) {
    console.error('💥 [ADMIN_BOOKS_POST] Error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A book with this title already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const user = await currentUser()
    if (!user?.id) return new NextResponse("Unauthorized", { status: 401 })

    const books = await db.book.findMany({
      include: {
        teams: true,
        events: {
          include: {
            outcomes: true,
            bets: {
              select: {
                id: true,
                status: true
              }
            }
          }
        },
        bets: true
      },
      orderBy: {
        date: 'desc' // Order books by date
      }
    })

    return NextResponse.json(books)
  } catch (error) {
    console.log('[ADMIN_BOOKS_GET]', error)
    return new NextResponse("Internal error", { status: 500 })
  }
}