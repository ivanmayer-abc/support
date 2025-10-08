import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    if (!params.userId) {
      return new NextResponse("User id is required", { status: 400 });
    }

    const user = await db.user.findUnique({
      where: {
        id: params.userId
      },
      include: {
        image: true,
      }
    });
  
    return NextResponse.json(user);
  } catch (error) {
    console.log('[USER_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const body = await req.json();
    const { url } = body.userImage;

    if (!params.userId) {
      return new NextResponse("User id is required", { status: 400 });
    }

    const user = await db.user.update({
      where: { id: params.userId },
      data: { isImageApproved: 'pending' },
    });

    const existingImage = await db.image.findUnique({
      where: { userId: params.userId }
    });

    let image;
    if (existingImage) {
      image = await db.image.update({
        where: { userId: params.userId },
        data: { url },
      });
    } else {
      image = await db.image.create({
        data: {
          userId: params.userId,
          url,
        },
      });
    }

    return NextResponse.json({ user, image });
  } catch (error) {
    console.log('[USER_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}