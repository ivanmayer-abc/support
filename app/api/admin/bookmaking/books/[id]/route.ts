import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { currentUser } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    if (!user?.id) return new NextResponse("Unauthorized", { status: 401 })

    const { id } = params

    const book = await db.book.findUnique({
      where: { id },
      include: {
        teams: true,
        events: {
          include: {
            outcomes: true,
            bets: {
              select: {
                id: true,
                status: true,
                amount: true,
                potentialWin: true
              }
            }
          }
        },
        bets: {
          select: {
            id: true,
            status: true,
            amount: true,
            potentialWin: true,
            createdAt: true
          }
        }
      }
    })

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(book)
  } catch (error) {
    console.log('[ADMIN_BOOKS_GET_SINGLE]', error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { status, title, date, category, image } = body

    console.log(`🔧 [PATCH] Updating book ${id} with data:`, body)

    // Validate the book exists
    const existingBook = await db.book.findUnique({
      where: { id }
    })

    if (!existingBook) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (status) {
      // Validate status
      const validStatuses = ['ACTIVE', 'SETTLED', 'CANCELLED', 'COMPLETED']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = status
      
      // REMOVED: settledAt field since it doesn't exist in your schema
      // If you need this field, you'll need to add it to your Prisma schema
    }

    if (title) updateData.title = title
    if (date) updateData.date = new Date(date)
    if (category) updateData.category = category
    if (image !== undefined) updateData.image = image

    // If no valid fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update the book
    const updatedBook = await db.book.update({
      where: { id },
      data: updateData,
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
        }
      }
    })

    console.log(`✅ [PATCH] Book ${id} updated successfully to status: ${updatedBook.status}`)

    return NextResponse.json({
      success: true,
      message: 'Book updated successfully',
      data: updatedBook
    })

  } catch (error: any) {
    console.error(`💥 [ADMIN_BOOKS_PATCH] Error updating book ${params.id}:`, error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }
    
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