import { type NextRequest, NextResponse } from "next/server"
import { removeUserGift, getUserGifts } from "@/lib/auth-store"

// POST withdraw gift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, giftId } = body

    if (!telegramId || !giftId) {
      return NextResponse.json({ success: false, error: "Missing telegramId or giftId" }, { status: 400 })
    }

    // Verify gift exists for user
    const userGifts = getUserGifts(telegramId)
    const gift = userGifts.find((g) => g.id === giftId)

    if (!gift) {
      return NextResponse.json({ success: false, error: "Gift not found" }, { status: 404 })
    }

    // Remove gift from user's collection
    const removed = removeUserGift(telegramId, giftId)

    if (!removed) {
      return NextResponse.json({ success: false, error: "Failed to withdraw gift" }, { status: 500 })
    }

    console.log(`[WithdrawGift] Gift ${giftId} withdrawn by user ${telegramId}`)

    return NextResponse.json({
      success: true,
      message: "Gift withdrawal initiated",
      gift: {
        nftId: gift.nftId,
        collectionName: gift.collectionName,
      },
    })
  } catch (error) {
    console.error("[WithdrawGift] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
