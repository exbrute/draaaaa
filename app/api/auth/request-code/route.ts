import { type NextRequest, NextResponse } from "next/server"
import { setVerificationCode, generateCode, getVerificationCode } from "@/lib/auth-store"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8597794987:AAFyKeMrseSzAEDOpqW6bjpiCx2VRq78zh0"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, phone, code: botCode } = body

    if (!telegramId) {
      return NextResponse.json({ error: "telegramId is required" }, { status: 400 })
    }

    const telegramIdStr = telegramId.toString()

    // Это происходит когда пользователь поделился номером через бота
    if (botCode) {
      setVerificationCode(telegramIdStr, botCode, phone || "", "bot")
      return NextResponse.json({ success: true, message: "Code saved from bot" })
    }

    const existingCode = getVerificationCode(telegramIdStr)
    if (existingCode && existingCode.source === "bot") {
      // Уже есть код от бота, просто подтверждаем
      return NextResponse.json({ success: true, message: "Code already exists from bot" })
    }

    // Генерируем новый код только если нет кода от бота
    const code = generateCode()
    setVerificationCode(telegramIdStr, code, phone || "", "webapp")

    // Отправляем код пользователю в Telegram
    const message = `🔐 *Код авторизации MARKETPLACE*\n\nВаш код: \`${code}\`\n\nВведите его в приложении для завершения авторизации.\n\n⚠️ Код действителен 5 минут.`

    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramId,
          text: message,
          parse_mode: "Markdown",
        }),
      })
    } catch (tgError) {
      console.error("Failed to send Telegram message:", tgError)
      // Не возвращаем ошибку - код всё равно сохранён
    }

    return NextResponse.json({ success: true, message: "Code sent to Telegram" })
  } catch (error) {
    console.error("Error requesting code:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
