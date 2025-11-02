import axios from 'axios';

interface SportsEvent {
  id: string;
  sport: string;
  tournament: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  markets: Market[];
  homeTeamImage: string;
  awayTeamImage: string;
  bookImage: string;
}

interface Market {
  name: string;
  outcomes: Outcome[];
}

interface Outcome {
  name: string;
  odds: number;
}

interface MatchResult {
  eventId: string;
  homeScore?: number;
  awayScore?: number;
  winner?: string;
  status: 'COMPLETED' | 'CANCELLED' | 'LIVE' | 'UPCOMING';
  completedAt: string;
  outcomes: {
    marketName: string;
    winningOutcome: string;
  }[];
}

class SportsDataService {
  private apis = {
    theOddsApi: {
      key: process.env.THE_ODDS_API_KEY,
      baseUrl: 'https://api.the-odds-api.com/v4'
    },
    apiSports: {
      key: process.env.API_SPORTS_KEY,
      baseUrl: 'https://v1.rapidapi.com'
    }
  };

  async getRealEvents(sport: string = 'soccer'): Promise<SportsEvent[]> {
    if (!this.apis.theOddsApi.key) {
      throw new Error('THE_ODDS_API_KEY not configured');
    }

    try {
      const events = await this.getFromTheOddsApi(sport);
      return events.length > 0 ? events : await this.getFromTheOddsApi('soccer');
    } catch (error: any) {
      throw new Error(`API Error: ${error.message}`);
    }
  }

  private async getFromTheOddsApi(sport: string): Promise<SportsEvent[]> {
    const sportKey = this.mapSportToOddsApi(sport);
    
    const response = await axios.get(
      `${this.apis.theOddsApi.baseUrl}/sports/${sportKey}/odds`,
      {
        params: {
          apiKey: this.apis.theOddsApi.key,
          regions: 'uk,eu,us',
          markets: 'h2h,spreads,totals',
          oddsFormat: 'decimal'
        },
        timeout: 10000
      }
    );

    return this.transformTheOddsApiData(response.data);
  }

  private transformTheOddsApiData(data: any[]): SportsEvent[] {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((event) => {
      const allMarkets = this.getAllMarketsFromBookmakers(event.bookmakers);
      
      const istTime = this.convertToIST(event.commence_time);
      
      const homeTeamImage = this.getTeamImage(event.home_team, event.sport_key);
      const awayTeamImage = this.getTeamImage(event.away_team, event.sport_key);
      const bookImage = this.getBookImage(event.sport_title, event.sport_key);

      return {
        id: event.id,
        sport: event.sport_key,
        tournament: event.sport_title,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        startTime: istTime,
        markets: allMarkets,
        homeTeamImage,
        awayTeamImage,
        bookImage
      };
    }).filter(event => event.markets.length > 0);
  }

  private getAllMarketsFromBookmakers(bookmakers: any[]): Market[] {
    if (!bookmakers || !Array.isArray(bookmakers)) {
      return [];
    }

    const allMarkets: Market[] = [];
    const seenMarketNames = new Set();

    bookmakers.forEach(bookmaker => {
      if (bookmaker.markets && Array.isArray(bookmaker.markets)) {
        bookmaker.markets.forEach((market: any) => {
          if (this.isLayMarket(market)) return;
          
          const marketName = this.normalizeMarketName(market.key);
          
          if (!seenMarketNames.has(marketName)) {
            seenMarketNames.add(marketName);
            
            const marginedOutcomes = market.outcomes.map((outcome: any) => {
              const trueOdds = outcome.price;
              const marginedOdds = trueOdds * 0.90;
              
              return {
                name: outcome.name,
                odds: parseFloat(marginedOdds.toFixed(2))
              };
            });

            allMarkets.push({
              name: marketName,
              outcomes: marginedOutcomes
            });
          }
        });
      }
    });

    return allMarkets;
  }

  private isLayMarket(market: any): boolean {
    return market.key.includes('_lay') || 
           market.key === 'lay' ||
           market.title?.toLowerCase().includes('lay') ||
           market.description?.toLowerCase().includes('lay');
  }

  private mapSportToOddsApi(sport: string): string {
    const mapping: { [key: string]: string } = {
      'cricket': 'cricket',
      'football': 'soccer',
      'basketball': 'basketball',
      'tennis': 'tennis',
      'baseball': 'baseball',
      'hockey': 'icehockey',
      'rugby': 'rugby',
      'boxing': 'boxing',
      'mma': 'mma',
      'esports': 'esports'
    };
    
    return mapping[sport] || sport;
  }

  private normalizeMarketName(marketKey: string): string {
    const marketMap: { [key: string]: string } = {
      'h2h': 'Match Winner',
      'spreads': 'Handicap',
      'totals': 'Over/Under',
      'btts': 'Both Teams to Score',
      'double_chance': 'Double Chance',
      'draw_no_bet': 'Draw No Bet',
      'first_half_result': 'First Half Result'
    };
    return marketMap[marketKey] || marketKey;
  }

  private convertToIST(utcTime: string): string {
    const utcDate = new Date(utcTime);
    const istDate = new Date(utcDate.getTime());
    return istDate.toISOString().slice(0, 16);
  }

  private getTeamImage(teamName: string, sport: string): string {
    const teamSlug = teamName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const imageSources = {
      soccer: `https://media.api-sports.io/football/teams/${this.getFootballTeamId(teamName)}.png`,
      cricket: `https://media.api-sports.io/cricket/teams/${this.getCricketTeamId(teamName)}.png`,
      basketball: `https://media.api-sports.io/basketball/teams/${this.getBasketballTeamId(teamName)}.png`,
      default: `https://img.icons8.com/color/512/team.png`
    };

    return imageSources[sport as keyof typeof imageSources] || imageSources.default;
  }

  private getBookImage(tournament: string, sport: string): string {
    const tournamentLower = tournament.toLowerCase();
    
    const flags = {
      'premier league': 'https://flagsapi.com/GB/flat/64.png',
      'la liga': 'https://flagsapi.com/ES/flat/64.png',
      'serie a': 'https://flagsapi.com/IT/flat/64.png',
      'bundesliga': 'https://flagsapi.com/DE/flat/64.png',
      'world cup': 'https://flagsapi.com/UN/flat/64.png',
      'champions league': 'https://upload.wikimedia.org/wikipedia/en/0/0b/UEFA_Champions_League.svg',
      'europa league': 'https://upload.wikimedia.org/wikipedia/en/5/5a/UEFA_Europa_League.svg',
      'nba': 'https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg',
      'nfl': 'https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg',
      'mlb': 'https://upload.wikimedia.org/wikipedia/en/a/a6/Major_League_Baseball_logo.svg',
      'nhl': 'https://upload.wikimedia.org/wikipedia/en/3/3a/05_NHL_Shield.svg'
    };

    for (const [key, flag] of Object.entries(flags)) {
      if (tournamentLower.includes(key)) {
        return flag;
      }
    }

    const sportImages = {
      cricket: 'https://img.icons8.com/color/512/cricket.png',
      soccer: 'https://img.icons8.com/color/512/football.png',
      basketball: 'https://img.icons8.com/color/512/basketball.png',
      tennis: 'https://img.icons8.com/color/512/tennis.png',
      baseball: 'https://img.icons8.com/color/512/baseball.png',
      hockey: 'https://img.icons8.com/color/512/hockey.png',
      rugby: 'https://img.icons8.com/color/512/rugby.png',
      boxing: 'https://img.icons8.com/color/512/boxing.png',
      mma: 'https://img.icons8.com/color/512/martial-arts.png',
      esports: 'https://img.icons8.com/color/512/esports.png',
      default: 'https://img.icons8.com/color/512/trophy.png'
    };

    return sportImages[sport as keyof typeof sportImages] || sportImages.default;
  }

  private getFootballTeamId(teamName: string): number {
    const teamIds: { [key: string]: number } = {
      'manchester united': 33,
      'liverpool': 40,
      'chelsea': 49,
      'arsenal': 42,
      'manchester city': 50,
      'tottenham': 47,
      'barcelona': 529,
      'real madrid': 541,
      'bayern munich': 157,
      'psg': 85,
      'juventus': 496,
      'ac milan': 489,
      'inter milan': 505,
      'borussia dortmund': 165,
      'atletico madrid': 530
    };
    return teamIds[teamName.toLowerCase()] || 1;
  }

  private getCricketTeamId(teamName: string): number {
    const teamIds: { [key: string]: number } = {
      'india': 1,
      'australia': 2,
      'england': 3,
      'south africa': 4,
      'new zealand': 5,
      'pakistan': 6,
      'sri lanka': 7,
      'west indies': 8,
      'bangladesh': 9,
      'afghanistan': 10
    };
    return teamIds[teamName.toLowerCase()] || 1;
  }

  private getBasketballTeamId(teamName: string): number {
    const teamIds: { [key: string]: number } = {
      'lakers': 14,
      'warriors': 11,
      'bulls': 6,
      'celtics': 2,
      'knicks': 20,
      'heat': 16,
      'spurs': 27,
      'mavericks': 8
    };
    return teamIds[teamName.toLowerCase()] || 1;
  }

  async getMatchResults(eventId: string, homeTeam: string, awayTeam: string, sport: string): Promise<MatchResult | null> {
    try {
      if (sport === 'soccer' && this.apis.apiSports.key) {
        return await this.getFootballMatchResult(homeTeam, awayTeam);
      }
      
      return await this.getScoresFromOddsApi(eventId, sport);
      
    } catch (error) {
      console.error('Error fetching match results:', error);
      return null;
    }
  }

  private async getFootballMatchResult(homeTeam: string, awayTeam: string): Promise<MatchResult | null> {
    try {
      const response = await axios.get(
        `${this.apis.apiSports.baseUrl}/fixtures`,
        {
          params: {
            team: this.getFootballTeamId(homeTeam),
            last: 1
          },
          headers: {
            'X-RapidAPI-Key': this.apis.apiSports.key,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
          },
          timeout: 10000
        }
      );

      const fixtures = response.data.response;
      if (!fixtures || fixtures.length === 0) return null;

      const fixture = fixtures[0];
      if (fixture.fixture.status.short !== 'FT') return null;

      const homeScore = fixture.goals.home;
      const awayScore = fixture.goals.away;
      
      let winner = 'Draw';
      if (homeScore > awayScore) winner = homeTeam;
      if (awayScore > homeScore) winner = awayTeam;

      return {
        eventId: fixture.fixture.id.toString(),
        homeScore,
        awayScore,
        winner,
        status: 'COMPLETED',
        completedAt: fixture.fixture.date,
        outcomes: this.calculateFootballOutcomes(homeTeam, awayTeam, homeScore, awayScore)
      };
    } catch (error) {
      console.error('Error fetching football results:', error);
      return null;
    }
  }

  private async getScoresFromOddsApi(eventId: string, sport: string): Promise<MatchResult | null> {
    try {
      const response = await axios.get(
        `${this.apis.theOddsApi.baseUrl}/sports/${sport}/scores`,
        {
          params: {
            apiKey: this.apis.theOddsApi.key,
            daysFrom: 1,
            eventIds: eventId
          },
          timeout: 10000
        }
      );

      const scores = response.data;
      if (!scores || scores.length === 0) return null;

      const match = scores[0];
      if (match.completed) {
        return {
          eventId: match.id,
          homeScore: match.scores?.[0]?.score,
          awayScore: match.scores?.[1]?.score,
          winner: this.determineWinner(match),
          status: 'COMPLETED',
          completedAt: match.commence_time,
          outcomes: this.calculateOutcomesFromScore(match)
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching scores from Odds API:', error);
      return null;
    }
  }

  private calculateFootballOutcomes(homeTeam: string, awayTeam: string, homeScore: number, awayScore: number) {
    const outcomes = [];
    
    if (homeScore > awayScore) {
      outcomes.push({ marketName: 'Match Winner', winningOutcome: homeTeam });
    } else if (awayScore > homeScore) {
      outcomes.push({ marketName: 'Match Winner', winningOutcome: awayTeam });
    } else {
      outcomes.push({ marketName: 'Match Winner', winningOutcome: 'Draw' });
    }

    if (homeScore > 0 && awayScore > 0) {
      outcomes.push({ marketName: 'Both Teams to Score', winningOutcome: 'Yes' });
    } else {
      outcomes.push({ marketName: 'Both Teams to Score', winningOutcome: 'No' });
    }

    const totalGoals = homeScore + awayScore;
    if (totalGoals > 2.5) {
      outcomes.push({ marketName: 'Over/Under', winningOutcome: 'Over 2.5' });
    } else {
      outcomes.push({ marketName: 'Over/Under', winningOutcome: 'Under 2.5' });
    }

    return outcomes;
  }

  private calculateOutcomesFromScore(match: any) {
    const outcomes = [];
    
    if (match.scores && match.scores.length >= 2) {
      const homeScore = match.scores[0].score;
      const awayScore = match.scores[1].score;
      const homeTeam = match.home_team;
      const awayTeam = match.away_team;

      if (homeScore > awayScore) {
        outcomes.push({ marketName: 'Match Winner', winningOutcome: homeTeam });
      } else if (awayScore > homeScore) {
        outcomes.push({ marketName: 'Match Winner', winningOutcome: awayTeam });
      } else {
        outcomes.push({ marketName: 'Match Winner', winningOutcome: 'Draw' });
      }
    }

    return outcomes;
  }

  private determineWinner(match: any): string {
    if (!match.scores || match.scores.length < 2) return 'Unknown';
    
    const homeScore = match.scores[0].score;
    const awayScore = match.scores[1].score;
    
    if (homeScore > awayScore) return match.home_team;
    if (awayScore > homeScore) return match.away_team;
    return 'Draw';
  }
}

export const sportsDataService = new SportsDataService();