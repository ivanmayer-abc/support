// app/[id]/manage/page.tsx
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { currentUser } from '@/lib/auth'
import BookManagement from '@/components/bookmaking/book-management'

interface PageProps {
  params: {
    id: string
  }
}

export default async function ManageBookPage({ params }: PageProps) {
  const user = await currentUser()
  
  if (!user?.id) {
    notFound()
  }

  const book = await db.book.findUnique({
    where: {
      id: params.id,
      userId: user.id
    },
    include: {
      teams: true,
      events: {
        include: {
          outcomes: true,
          homeTeam: true,
          awayTeam: true,
          bets: {
            select: {
              id: true,
              status: true
            }
          }
        }
      },
      bets: {
        select: {
          id: true,
          status: true
        }
      }
    }
  })

  if (!book) {
    notFound()
  }

  // Transform the book data to match the Book type
  const bookData = {
    ...book,
    description: book.description || undefined,
    image: book.image || undefined,
    teams: book.teams.map(team => ({
      id: team.id,
      name: team.name,
      image: team.image || undefined,
      bookId: team.bookId || undefined
    })),
    events: book.events.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description || undefined,
      isFirstFastOption: event.isFirstFastOption,
      isSecondFastOption: event.isSecondFastOption,
      homeTeam: event.homeTeam ? {
        id: event.homeTeam.id,
        name: event.homeTeam.name,
        image: event.homeTeam.image || undefined,
        bookId: event.homeTeam.bookId || undefined
      } : undefined,
      awayTeam: event.awayTeam ? {
        id: event.awayTeam.id,
        name: event.awayTeam.name,
        image: event.awayTeam.image || undefined,
        bookId: event.awayTeam.bookId || undefined
      } : undefined,
      homeTeamId: event.homeTeamId || undefined,
      awayTeamId: event.awayTeamId || undefined,
      bookId: event.bookId,
      outcomes: event.outcomes.map(outcome => ({
        id: outcome.id,
        name: outcome.name,
        odds: outcome.odds,
        probability: outcome.probability,
        stake: outcome.stake,
        result: outcome.result || 'PENDING',
        eventId: outcome.eventId
      })),
      createdAt: event.createdAt
    }))
  }

  return <BookManagement book={bookData} />
}