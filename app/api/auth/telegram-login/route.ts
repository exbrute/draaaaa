import { type NextRequest, NextResponse } from "next/server"
import { authStore } from "@/lib/auth-store"

// Simulated 2FA check - in production this would connect to Telegram API
const users2FA: Record<string, boolean> = {}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, phone, code, password, action } = body

    if (!telegramId || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    switch (action) {
      case "request_code": {
        // In production: Use Telegram API to send auth code
        // For demo: Generate a code and store it
        const authCode = Math.floor(10000 + Math.random() * 90000).toString()
        authStore.pendingCodes.set(telegramId.toString(), {
          code: authCode,
          phone: phone || "",
          createdAt: Date.now(),
        })

        // Simulate: randomly assign 2FA to some users (30% chance)
        users2FA[telegramId.toString()] = Math.random() < 0.3

        console.log(`[Demo] Auth code for ${telegramId}: ${authCode}`)

        return NextResponse.json({
          success: true,
          message: "Code sent to Telegram",
          // In demo mode, return the code for testing
          demoCode: process.env.NODE_ENV === "development" ? authCode : undefined,
        })
      }

      case "verify_code": {
        const pending = authStore.pendingCodes.get(telegramId.toString())

        if (!pending) {
          return NextResponse.json({ success: false, error: "Код не найден. Запросите новый" }, { status: 400 })
        }

        // Check if code expired (5 minutes)
        if (Date.now() - pending.createdAt > 5 * 60 * 1000) {
          authStore.pendingCodes.delete(telegramId.toString())
          return NextResponse.json({ success: false, error: "Код истёк. Запросите новый" }, { status: 400 })
        }

        if (pending.code !== code) {
          return NextResponse.json({ success: false, error: "Неверный код" }, { status: 400 })
        }

        // Check if user has 2FA enabled
        const has2FA = users2FA[telegramId.toString()] || false

        if (has2FA) {
          // Mark code as verified but waiting for 2FA
          authStore.pendingCodes.set(telegramId.toString(), {
            ...pending,
            codeVerified: true,
          })

          return NextResponse.json({
            success: true,
            requires2FA: true,
            message: "Code verified, 2FA required",
          })
        }

        // No 2FA - complete login
        authStore.pendingCodes.delete(telegramId.toString())
        const sessionToken = `session_${telegramId}_${Date.now()}`

        authStore.sessions.set(sessionToken, {
          telegramId: telegramId.toString(),
          phone: pending.phone,
          createdAt: Date.now(),
        })

        return NextResponse.json({
          success: true,
          requires2FA: false,
          sessionToken,
        })
      }

      case "verify_2fa": {
        const pending = authStore.pendingCodes.get(telegramId.toString())

        if (!pending || !pending.codeVerified) {
          return NextResponse.json({ success: false, error: "Сначала подтвердите код" }, { status: 400 })
        }

        // In production: Verify password with Telegram API
        // For demo: Accept any password with 4+ characters
        if (!password || password.length < 4) {
          return NextResponse.json({ success: false, error: "Неверный пароль" }, { status: 400 })
        }

        // Complete login
        authStore.pendingCodes.delete(telegramId.toString())
        const sessionToken = `session_${telegramId}_${Date.now()}`

        authStore.sessions.set(sessionToken, {
          telegramId: telegramId.toString(),
          phone: pending.phone,
          createdAt: Date.now(),
        })

        return NextResponse.json({
          success: true,
          sessionToken,
        })
      }

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Telegram login error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
