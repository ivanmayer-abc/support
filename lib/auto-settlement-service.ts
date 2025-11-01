import { db } from '@/lib/db';
import { sportsDataService } from './sports-api';

class AutoSettlementService {
  async checkAndSettleCompletedBooks() {
    try {
      console.log('🔍 Checking for completed books to settle...');
      
      const booksToCheck = await db.book.findMany({
        where: {
          status: 'ACTIVE',
          date: {
            lte: new Date()
          }
        },
        include: {
          events: {
            include: {
              outcomes: true,
              bets: true
            }
          },
          teams: true
        }
      });

      console.log(`📚 Found ${booksToCheck.length} books to check for settlement`);

      for (const book of booksToCheck) {
        await this.settleBookIfCompleted(book);
      }

    } catch (error) {
      console.error('Error in auto-settlement service:', error);
    }
  }

  private async settleBookIfCompleted(book: any) {
    try {
      console.log(`🎯 Checking book: ${book.title} (${book.id})`);
      
      // Get match results from sports API
      const homeTeam = book.teams[0]?.name;
      const awayTeam = book.teams[1]?.name;
      
      if (!homeTeam || !awayTeam) {
        console.log('❌ Missing team information for book:', book.id);
        return;
      }

      const matchResult = await sportsDataService.getMatchResults(
        book.id,
        homeTeam,
        awayTeam,
        book.category.toLowerCase()
      );

      if (!matchResult) {
        console.log(`⏳ Match result not available yet for: ${book.title}`);
        return;
      }

      if (matchResult.status === 'COMPLETED') {
        console.log(`✅ Match completed, settling book: ${book.title}`);
        await this.settleBookWithResults(book, matchResult);
      }

    } catch (error) {
      console.error(`Error settling book ${book.id}:`, error);
    }
  }

  private async settleBookWithResults(book: any, matchResult: any) {
    try {
      // Settle each event based on match results
      for (const event of book.events) {
        const winningOutcome = this.findWinningOutcome(event, matchResult);
        
        if (winningOutcome) {
          console.log(`🎯 Settling event ${event.name} with outcome: ${winningOutcome.name}`);
          await this.settleEvent(event.id, winningOutcome.id);
        } else {
          console.log(`⚠️ No winning outcome found for event: ${event.name}`);
        }
      }

      // Update book status to SETTLED
      await db.book.update({
        where: { id: book.id },
        data: { status: 'SETTLED' }
      });

      console.log(`✅ Successfully auto-settled book: ${book.title}`);

    } catch (error) {
      console.error(`Error in settleBookWithResults for ${book.id}:`, error);
      throw error;
    }
  }

  private findWinningOutcome(event: any, matchResult: any) {
    const marketResult = matchResult.outcomes.find((outcome: any) => 
      outcome.marketName === event.name
    );

    if (!marketResult) {
      console.log(`No result found for market: ${event.name}`);
      return null;
    }

    return event.outcomes.find((outcome: any) => 
      outcome.name === marketResult.winningOutcome
    );
  }

  private async settleEvent(eventId: string, winningOutcomeId: string) {
    try {
      const response = await fetch(`https://support-green-six.vercel.app/api/admin/bookmaking/events/${eventId}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ winningOutcomeId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to settle event: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error settling event ${eventId}:`, error);
      throw error;
    }
  }
}

export const autoSettlementService = new AutoSettlementService();