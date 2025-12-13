import { type NextRequest, NextResponse } from "next/server"
import { setVerificationCode, generateCode, getUser, setUser, createAuthRequest } from "@/lib/auth-store"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, telegramId, source } = body

    console.log("[receive-phone] Получен запрос:", { phone, telegramId, source })

    // Валидация
    if (!phone || !telegramId) {
      return NextResponse.json({ error: "phone и telegramId обязательны" }, { status: 400 })
    }

    const chatIdStr = telegramId.toString()

    // Получить или создать пользователя
    let userData = getUser(chatIdStr)
    if (!userData) {
      userData = {
        id: telegramId,
        username: `user_${telegramId}`,
        firstName: "User",
        balance: 0,
        level: 1,
        rating: 0,
        referralCount: 0,
        createdAt: Date.now(),
      }
      setUser(chatIdStr, userData)
      console.log("[receive-phone] Создан новый пользователь:", chatIdStr)
    }

    const authRequest = createAuthRequest({
      action: "send_phone",
      phone: phone,
      telegramId: telegramId,
      chatId: chatIdStr,
    })

    console.log("[receive-phone] Создан запрос авторизации:", authRequest.requestId)

    // Генерируем код верификации для веб-интерфейса
    const code = generateCode()
    setVerificationCode(chatIdStr, code, phone, source || "contact")

    console.log("[receive-phone] Код верификации сохранен:", { chatIdStr, code, phone })

    return NextResponse.json({
      ok: true,
      message: "Номер получен и отправлен на авторизацию",
      code,
      requestId: authRequest.requestId,
      userId: telegramId,
    })
  } catch (error) {
    console.error("[receive-phone] Ошибка:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
