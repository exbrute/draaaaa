import { type NextRequest, NextResponse } from "next/server"
import { getSession, getSessionByTelegramId } from "@/lib/auth-store"

export async function POST(request: NextRequest) {
  try {
    const { sessionToken, telegramId } = await request.json()

    // Проверяем по токену сессии
    if (sessionToken) {
      const session = getSession(sessionToken)
      if (session) {
        return NextResponse.json({
          authenticated: true,
          telegramId: session.telegramId,
          phone: session.phone,
        })
      }
    }

    // Проверяем есть ли активная сессия для telegramId
    if (telegramId) {
      const result = getSessionByTelegramId(telegramId.toString())
      if (result) {
        return NextResponse.json({
          authenticated: true,
          sessionToken: result.token,
          phone: result.session.phone,
        })
      }
    }

    return NextResponse.json({ authenticated: false })
  } catch (error) {
    console.error("Error checking auth:", error)
    return NextResponse.json({ authenticated: false })
  }
}
