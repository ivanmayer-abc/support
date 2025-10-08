export interface Book {
  id: string
  title: string
  description?: string
  category: string
  image?: string
  date: Date
  status: 'ACTIVE' | 'INACTIVE' | 'SETTLED' | 'CANCELLED'
  createdAt: Date
  updatedAt: Date
  userId: string
  teams: Team[]
  events: Event[]
  isLive?: boolean
  isUpcoming?: boolean
  displayStatus?: string
}

export interface Team {
  id: string
  name: string
  image?: string
  bookId?: string
}

export interface Event {
  id: string
  name: string
  description?: string
  isFirstFastOption: boolean
  isSecondFastOption: boolean
  homeTeam?: Team
  awayTeam?: Team
  homeTeamId?: string
  awayTeamId?: string
  bookId: string
  outcomes: Outcome[]
  createdAt: Date
  startTime?: Date
}

export interface Outcome {
  id: string
  name: string
  odds: number
  probability: number
  stake: number
  result: 'PENDING' | 'WIN' | 'LOSE' | 'VOID'
  eventId: string
}