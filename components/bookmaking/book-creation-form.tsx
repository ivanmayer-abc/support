'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, AlertCircle, Users, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const CATEGORIES = [
  'Football',
  'Basketball', 
  'Cricket',
  'Tennis',
  'Baseball',
  'Hockey',
  'Rugby',
  'Boxing',
  'MMA',
  'Esports',
  'Other'
]

interface TeamForm {
  name: string
  image: string
}

interface EventForm {
  name: string
  isFirstFastOption: boolean
  isSecondFastOption: boolean
  outcomes: { name: string; odds: number }[]
}

export default function BookCreationForm() {
  const { data: session } = useSession()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [image, setImage] = useState('')
  const [teams, setTeams] = useState<TeamForm[]>([
    { name: '', image: '' }
  ])
  const [events, setEvents] = useState<EventForm[]>([
    { 
      name: '', 
      isFirstFastOption: true,
      isSecondFastOption: false,
      outcomes: [{ name: '', odds: 0 }] 
    }
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      
      if (index === 0 && events[0].isFirstFastOption && updatedEvents.length > 0) {
        updatedEvents[0].isFirstFastOption = true
      }
      
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
      toast.error("Please sign in to create a book")
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

    if (!category) {
      toast.error("Please select a category for the book")
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
      const response = await fetch('/api/admin/bookmaking/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          date,
          category,
          image: image || null,
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
        setTitle('')
        setDate('')
        setTeams([{ name: '', image: '' }])
        setEvents([{ 
          name: '', 
          isFirstFastOption: true,
          isSecondFastOption: false,
          outcomes: [{ name: '', odds: 0 }] 
        }])
        
        toast.success("Book created successfully!")

        router.push('/')
      } else {
        throw new Error(data.error || 'Failed to create book')
      }
    } catch (error: any) {
      console.error('Error creating book:', error)
      toast.error(error.message || "Failed to create book. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const validTeams = getValidTeams()
  const firstFastBetEvent = events.find(event => event.isFirstFastOption)
  const secondFastBetEvent = events.find(event => event.isSecondFastOption)

  return (
    <div className="px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Book</h1>
        <p className="text-muted-foreground mt-2">
          Create a betting book with teams and betting options
        </p>
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

            <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Book Image URL</Label>
              <Input
                id="image"
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/country-flag.png"
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Add a country flag or tournament logo (optional)
              </p>
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
                  Add teams that will be available for betting
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
                  At least 2 teams are required to create betting options
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team, teamIndex) => (
                <Card key={teamIndex} className="relative">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="secondary">Team {teamIndex + 1}</Badge>
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
                  Create different betting options with outcomes
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
              <Card key={eventIndex} className="relative">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <Badge variant="outline" className="mb-2">Option {eventIndex + 1}</Badge>
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

                  {/* Event Basic Info */}
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
                    <p className="text-sm text-muted-foreground mt-2">
                      Fast bets will be displayed prominently on the main page. Only one option can be 1st Fast Bet and one can be 2nd Fast Bet.
                    </p>
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
                      <div key={outcomeIndex} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end p-4 border rounded-lg">
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
            onClick={() => {
              setTitle('')
              setDate('')
              setTeams([{ name: '', image: '' }])
              setEvents([{ 
                name: '', 
                isFirstFastOption: true,
                isSecondFastOption: false,
                outcomes: [{ name: '', odds: 0 }] 
              }])
            }}
            variant="outline"
            disabled={isSubmitting}
          >
            Reset Form
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-32"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Create Book'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}