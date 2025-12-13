import { type NextRequest, NextResponse } from "next/server"
import { getVerificationCode, deleteVerificationCode, createSession } from "@/lib/auth-store"

export async function POST(request: NextRequest) {
  try {
    const { telegramId, code } = await request.json()

    if (!telegramId || !code) {
      return NextResponse.json({ error: "telegramId and code are required", valid: false }, { status: 400 })
    }

    const telegramIdStr = telegramId.toString()
    const stored = getVerificationCode(telegramIdStr)

    if (!stored) {
      return NextResponse.json({ error: "No code requested", valid: false }, { status: 400 })
    }

    if (stored.code !== code) {
      return NextResponse.json({ error: "Invalid code", valid: false }, { status: 400 })
    }

    // Код верный - создаем сессию
    const sessionToken = createSession(telegramIdStr, stored.phone)

    // Удаляем использованный код
    deleteVerificationCode(telegramIdStr)

    return NextResponse.json({
      valid: true,
      sessionToken,
      message: "Authentication successful",
    })
  } catch (error) {
    console.error("Error verifying code:", error)
    return NextResponse.json({ error: "Verification failed", valid: false }, { status: 500 })
  }
}
