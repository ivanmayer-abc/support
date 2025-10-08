import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export async function POST(
    request: Request
) {
    try {
        const user = await currentUser();
        if (!user?.id) {
          return new NextResponse("Unauthorized", { status: 401 });
        }
        if (user.isChatBlocked) {
            return new NextResponse("Chat access blocked", { status: 403 });
        }

        const body = await request.json()
        const { message, image, supportId } = body

        const isAdmin = user.role === 'ADMIN';

        const newMessage = await db.message.create({
            data: {
                body: message,
                image: image,
                conversation: {
                    connect: {
                        id: supportId
                    }
                },
                sender: {
                    connect: {
                        id: user.id
                    }
                },
                isReadByAdmin: isAdmin,
                isReadByUser: false
            }
        })

        const updatedConversation = await db.conversation.update({
            where: {
                id: supportId
            },
            data: {
                lastMessageAt: new Date(),
                messages: {
                    connect: {
                        id: newMessage.id
                    }
                }
            },
        })

        await pusherServer.trigger(supportId, 'messages:new', newMessage)

        return NextResponse.json(newMessage)
    } catch (error: any) {
        console.log(error, 'ERROR_MESSAGES');
        return new NextResponse('InternalError', { status: 500 })
    }
}