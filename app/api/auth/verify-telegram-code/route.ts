import { type NextRequest, NextResponse } from "next/server"
import { getTelegramAuth, updateTelegramAuth, deleteTelegramAuth } from "@/lib/auth-store"

// WebApp отправляет код, который ввёл пользователь
// Этот API передаст код боту для проверки через Pyrogram
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, code } = body

    if (!telegramId || !code) {
      return NextResponse.json({ success: false, error: "Missing telegramId or code" }, { status: 400 })
    }

    const telegramIdStr = telegramId.toString()
    const auth = getTelegramAuth(telegramIdStr)

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: "Сессия не найдена. Запросите код заново",
        },
        { status: 400 },
      )
    }

    // Проверяем время жизни сессии (10 минут)
    if (Date.now() - auth.createdAt > 10 * 60 * 1000) {
      deleteTelegramAuth(telegramIdStr)
      return NextResponse.json(
        {
          success: false,
          error: "Сессия истекла. Запросите код заново",
        },
        { status: 400 },
      )
    }

    // Сохраняем код и меняем статус - бот заберёт этот код через polling
    updateTelegramAuth(telegramIdStr, {
      code,
      status: "pending_code",
    })

    console.log(`[Auth] Code received from webapp for ${telegramIdStr}: ${code}`)

    return NextResponse.json({
      success: true,
      message: "Code received, waiting for verification",
      status: "pending_verification",
    })
  } catch (error) {
    console.error("Error verifying code:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
