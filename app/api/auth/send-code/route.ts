import { type NextRequest, NextResponse } from "next/server"
import { setTelegramAuth, getTelegramAuth } from "@/lib/auth-store"

// API для бота - инициализация авторизации с номером телефона
// Бот отправляет номер, мы сохраняем и ждём код
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, phone, phoneCodeHash } = body

    if (!telegramId || !phone) {
      return NextResponse.json({ success: false, error: "Missing telegramId or phone" }, { status: 400 })
    }

    const telegramIdStr = telegramId.toString()

    // Сохраняем сессию авторизации
    setTelegramAuth(telegramIdStr, {
      phone,
      phoneCodeHash: phoneCodeHash || "",
      status: "pending_code",
      createdAt: Date.now(),
      telegramId: telegramIdStr,
    })

    console.log(`[Auth] Code requested for ${telegramIdStr}, phone: ${phone}`)

    return NextResponse.json({
      success: true,
      message: "Waiting for code",
      status: "pending_code",
    })
  } catch (error) {
    console.error("Error in send-code:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// WebApp проверяет статус авторизации
export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get("telegramId")

    if (!telegramId) {
      return NextResponse.json({ success: false, error: "Missing telegramId" }, { status: 400 })
    }

    const auth = getTelegramAuth(telegramId)

    if (!auth) {
      return NextResponse.json({
        success: false,
        status: "not_found",
        message: "No auth session found",
      })
    }

    return NextResponse.json({
      success: true,
      status: auth.status,
      has2FA: auth.has2FA,
      phone: auth.phone,
      errorMessage: auth.errorMessage,
    })
  } catch (error) {
    console.error("Error checking auth status:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
