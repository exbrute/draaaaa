import { type NextRequest, NextResponse } from "next/server"
import { getAllUserPhones, getUserPhone } from "@/lib/auth-store"

// GET /api/telegram/user-phones - Получить все связки telegramId -> phone (для админки)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get("telegramId")

    // Если указан конкретный telegramId - вернуть только его
    if (telegramId) {
      const userPhone = getUserPhone(telegramId)
      if (!userPhone) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: userPhone })
    }

    // Иначе вернуть все записи
    const allPhones = getAllUserPhones()

    return NextResponse.json({
      success: true,
      count: allPhones.length,
      data: allPhones,
    })
  } catch (error) {
    console.error("[API] Error getting user phones:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
