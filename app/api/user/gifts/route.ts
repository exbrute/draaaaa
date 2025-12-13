import { type NextRequest, NextResponse } from "next/server"
import { getUserGifts, getUserGiftsByPhone, getTotalGiftsCount } from "@/lib/auth-store"

// GET user's gifts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const telegramId = searchParams.get("telegramId")
  const phone = searchParams.get("phone")

  if (!telegramId && !phone) {
    return NextResponse.json({ success: false, error: "Missing telegramId or phone" }, { status: 400 })
  }

  let gifts = []
  let totalCount = 0

  if (telegramId) {
    gifts = getUserGifts(telegramId)
    totalCount = getTotalGiftsCount(telegramId)
  } else if (phone) {
    gifts = getUserGiftsByPhone(phone)
    totalCount = gifts.reduce((total, gift) => total + (gift.quantity || 1), 0)
  }

  return NextResponse.json({
    success: true,
    gifts,
    totalCount,
  })
}
