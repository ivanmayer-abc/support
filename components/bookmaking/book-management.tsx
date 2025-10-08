'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, AlertCircle, Users, Calendar, ArrowLeft, Save } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Book, Team, Event } from '@/app/types/bookmaking'

interface TeamForm {
  id?: string
  name: string
  image: string
}

interface EventForm {
  id?: string
  name: string
  isFirstFastOption: boolean
  isSecondFastOption: boolean
  outcomes: { id?: string; name: string; odds: number }[]
}

interface BookManagementProps {
  book: Book
}

export default function BookManagement({ book }: BookManagementProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [title, setTitle] = useState(book.title)
  const [date, setDate] = useState(book.date ? new Date(book.date).toISOString().slice(0, 16) : '')
  const [teams, setTeams] = useState<TeamForm[]>([])
  const [events, setEvents] = useState<EventForm[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data when book changes
  useEffect(() => {
    if (book) {
      setTitle(book.title)
      setDate(book.date ? new Date(book.date).toISOString().slice(0, 16) : '')
      
      // Transform teams data
      const transformedTeams: TeamForm[] = (book.teams || []).map(team => ({
        id: team.id,
        name: team.name,
        image: team.image || '' // Handle null image
      }))
      setTeams(transformedTeams.length > 0 ? transformedTeams : [{ name: '', image: '' }])
      
      // Transform events data
      const transformedEvents: EventForm[] = (book.events || []).map(event => ({
        id: event.id,
        name: event.name,
        isFirstFastOption: event.isFirstFastOption,
        isSecondFastOption: event.isSecondFastOption,
        outcomes: (event.outcomes || []).map(outcome => ({
          id: outcome.id,
          name: outcome.name,
          odds: outcome.odds
        }))
      }))
      setEvents(transformedEvents.length > 0 ? transformedEvents : [{ 
        name: '', 
        isFirstFastOption: true,
        isSecondFastOption: false,
        outcomes: [{ name: '', odds: 0 }] 
      }])
    }
  }, [book])

  const addTeam = () => {
    setTeams([...teams, { name: '', image: '' }])
  }

  const removeTeam = (index: number) => {
    if (teams.length > 1) {
      setTeams(teams.filter((_, i) => i !== index))
    }
  }

  const updateTeam = (index: number, field: string, value: string) => {
    const updatedTeams = [...teams]
    updatedTeams[index] = { ...updatedTeams[index], [field]: value }
    setTeams(updatedTeams)
  }

  const addEvent = () => {
    setEvents([...events, { 
      name: '', 
      isFirstFastOption: false,
      isSecondFastOption: false,
      outcomes: [{ name: '', odds: 0 }] 
    }])
  }

  const removeEvent = (index: number) => {
    if (events.length > 1) {
      const updatedEvents = events.filter((_, i) => i !== index)
      setEvents(updatedEvents)
    }
  }

  const updateEvent = (index: number, field: string, value: any) => {
    const updatedEvents = [...events]
    
    if (field === 'isFirstFastOption' && value === true) {
      updatedEvents.forEach((event, i) => {
        if (i !== index) {
          event.isFirstFastOption = false
        }
      })
    }
    
    if (field === 'isSecondFastOption' && value === true) {
      updatedEvents.forEach((event, i) => {
        if (i !== index) {
          event.isSecondFastOption = false
        }
      })
    }
    
    updatedEvents[index] = { ...updatedEvents[index], [field]: value }
    setEvents(updatedEvents)
  }

  const addOutcome = (eventIndex: number) => {
    const updatedEvents = [...events]
    updatedEvents[eventIndex].outcomes.push({ name: '', odds: 0 })
    setEvents(updatedEvents)
  }

  const removeOutcome = (eventIndex: number, outcomeIndex: number) => {
    const updatedEvents = [...events]
    if (updatedEvents[eventIndex].outcomes.length > 1) {
      updatedEvents[eventIndex].outcomes = updatedEvents[eventIndex].outcomes.filter(
        (_, i) => i !== outcomeIndex
      )
      setEvents(updatedEvents)
    }
  }

  const updateOutcome = (eventIndex: number, outcomeIndex: number, field: string, value: any) => {
    const updatedEvents = [...events]
    updatedEvents[eventIndex].outcomes[outcomeIndex] = {
      ...updatedEvents[eventIndex].outcomes[outcomeIndex],
      [field]: value
    }
    setEvents(updatedEvents)
  }

  const getValidTeams = () => {
    return teams.filter(team => team.name.trim() !== '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session?.user?.id) {
      toast.error("Please sign in to update the book")
      return
    }

    const validTeams = getValidTeams()
    if (validTeams.length < 2) {
      toast.error("Please add at least 2 teams to create events")
      return
    }

    const validEvents = events.filter(event => 
      event.name.trim() !== '' && 
      event.outcomes.every(outcome => outcome.name.trim() !== '' && outcome.odds > 1)
    )

    if (validEvents.length === 0) {
      toast.error("Please add at least one valid event with valid outcomes")
      return
    }

    if (!date) {
      toast.error("Please select a date for the book")
      return
    }

    const firstFastBetCount = validEvents.filter(event => event.isFirstFastOption).length
    const secondFastBetCount = validEvents.filter(event => event.isSecondFastOption).length

    if (firstFastBetCount > 1) {
      toast.error("Only one event can be selected as 1st Fast Bet")
      return
    }

    if (secondFastBetCount > 1) {
      toast.error("Only one event can be selected as 2nd Fast Bet")
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/admin/bookmaking/books/${book.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          date,
          teams: validTeams,
          events: validEvents.map(event => ({
            ...event,
            outcomes: event.outcomes.map(outcome => ({
              ...outcome,
              odds: parseFloat(outcome.odds.toString())
            }))
          }))
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Book updated successfully!")
        router.push('/') // Redirect to admin dashboard
      } else {
        throw new Error(data.error || 'Failed to update book')
      }
    } catch (error: any) {
      console.error('Error updating book:', error)
      toast.error(error.message || "Failed to update book. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const validTeams = getValidTeams()
  const firstFastBetEvent = events.find(event => event.isFirstFastOption)
  const secondFastBetEvent = events.find(event => event.isSecondFastOption)

  if (!book) {
    return <div>Loading...</div>
  }

  return (
    <div className="px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Book</h1>
            <p className="text-muted-foreground mt-2">
              Update book information, teams, and betting options
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Book Information */}
        <Card>
          <CardHeader>
            <CardTitle>Book Information</CardTitle>
            <CardDescription>
              Basic information about your betting book
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Book Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Premier League 2024"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Book Date *</Label>
              <Input
                id="date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Teams Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Teams
                </CardTitle>
                <CardDescription>
                  Manage teams for this book
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={addTeam}
                disabled={isSubmitting}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Team
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {validTeams.length < 2 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  At least 2 teams are required
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team, teamIndex) => (
                <Card key={team.id || `new-${teamIndex}`} className="relative">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="secondary">
                        {team.id ? `Team ${teamIndex + 1}` : 'New Team'}
                      </Badge>
                      {teams.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeTeam(teamIndex)}
                          variant="ghost"
                          size="sm"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`team-name-${teamIndex}`}>Team Name *</Label>
                        <Input
                          id={`team-name-${teamIndex}`}
                          value={team.name}
                          onChange={(e) => updateTeam(teamIndex, 'name', e.target.value)}
                          placeholder="e.g., Manchester United"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`team-image-${teamIndex}`}>Team Image URL</Label>
                        <Input
                          id={`team-image-${teamIndex}`}
                          type="url"
                          value={team.image}
                          onChange={(e) => updateTeam(teamIndex, 'image', e.target.value)}
                          placeholder="https://example.com/team-logo.png"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Betting Options Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Betting Options
                </CardTitle>
                <CardDescription>
                  Manage betting options and outcomes
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={addEvent}
                disabled={isSubmitting || validTeams.length < 2}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {events.map((event, eventIndex) => (
              <Card key={event.id || `new-${eventIndex}`} className="relative">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {event.id ? `Option ${eventIndex + 1}` : 'New Option'}
                      </Badge>
                      {event.isFirstFastOption && (
                        <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">1st Fast Bet</Badge>
                      )}
                      {event.isSecondFastOption && (
                        <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">2nd Fast Bet</Badge>
                      )}
                    </div>
                    {events.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeEvent(eventIndex)}
                        variant="ghost"
                        size="sm"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor={`event-name-${eventIndex}`}>Betting Option Name *</Label>
                      <Input
                        id={`event-name-${eventIndex}`}
                        value={event.name}
                        onChange={(e) => updateEvent(eventIndex, 'name', e.target.value)}
                        placeholder="e.g., Match Winner, Total Goals, Both Teams to Score"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Fast Bet Options */}
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <Label className="text-base font-medium mb-3 block">Fast Bet Options</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`first-fast-${eventIndex}`}
                          checked={event.isFirstFastOption}
                          onCheckedChange={(checked) => updateEvent(eventIndex, 'isFirstFastOption', checked)}
                          disabled={isSubmitting || (firstFastBetEvent && firstFastBetEvent !== event)}
                        />
                        <Label htmlFor={`first-fast-${eventIndex}`} className="font-medium">
                          1st Fast Bet Position
                          {firstFastBetEvent && firstFastBetEvent !== event && (
                            <span className="text-xs text-muted-foreground block">
                              Already selected in "{firstFastBetEvent.name || 'another option'}"
                            </span>
                          )}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`second-fast-${eventIndex}`}
                          checked={event.isSecondFastOption}
                          onCheckedChange={(checked) => updateEvent(eventIndex, 'isSecondFastOption', checked)}
                          disabled={isSubmitting || (secondFastBetEvent && secondFastBetEvent !== event)}
                        />
                        <Label htmlFor={`second-fast-${eventIndex}`} className="font-medium">
                          2nd Fast Bet Position
                          {secondFastBetEvent && secondFastBetEvent !== event && (
                            <span className="text-xs text-muted-foreground block">
                              Already selected in "{secondFastBetEvent.name || 'another option'}"
                            </span>
                          )}
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Outcomes */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-medium">Outcomes *</Label>
                      <Button
                        type="button"
                        onClick={() => addOutcome(eventIndex)}
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Outcome
                      </Button>
                    </div>

                    {event.outcomes.map((outcome, outcomeIndex) => (
                      <div key={outcome.id || `new-${outcomeIndex}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end p-4 border rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor={`outcome-name-${eventIndex}-${outcomeIndex}`}>
                            Outcome Name *
                          </Label>
                          <Input
                            id={`outcome-name-${eventIndex}-${outcomeIndex}`}
                            value={outcome.name}
                            onChange={(e) => updateOutcome(eventIndex, outcomeIndex, 'name', e.target.value)}
                            placeholder="e.g., Team A Wins, Draw, Over 2.5 Goals, Yes"
                            required
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="space-y-2 flex-1">
                            <Label htmlFor={`outcome-odds-${eventIndex}-${outcomeIndex}`}>
                              Odds *
                            </Label>
                            <Input
                              id={`outcome-odds-${eventIndex}-${outcomeIndex}`}
                              type="number"
                              placeholder="1.50"
                              step="0.01"
                              min="1.01"
                              value={outcome.odds || ''}
                              onChange={(e) => updateOutcome(eventIndex, outcomeIndex, 'odds', e.target.value ? parseFloat(e.target.value) : 0)}
                              required
                              disabled={isSubmitting}
                            />
                          </div>
                          {event.outcomes.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeOutcome(eventIndex, outcomeIndex)}
                              variant="ghost"
                              size="sm"
                              disabled={isSubmitting}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            onClick={() => router.back()}
            variant="outline"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-32"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}