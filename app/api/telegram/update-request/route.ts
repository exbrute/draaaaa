import { type NextRequest, NextResponse } from "next/server"
import {
  getAuthRequest,
  updateAuthRequest,
  getLatestAuthRequestByPhone,
  getAuthRequestByTelegramId,
  createAuthRequest,
  linkUserPhone,
} from "@/lib/auth-store"

// POST /api/telegram/update-request - Обновить или создать запрос (вызывается ботом)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, phone, telegramId, status, message, error, processed, action } = body

    console.log(`[v0] [update-request] Incoming request:`, JSON.stringify(body))

    let existingRequest = null

    if (requestId) {
      existingRequest = getAuthRequest(requestId)
      console.log(`[v0] [update-request] By requestId ${requestId}: ${existingRequest ? "found" : "not found"}`)
    }

    if (!existingRequest && telegramId) {
      existingRequest = getAuthRequestByTelegramId(telegramId)
      console.log(`[v0] [update-request] By telegramId ${telegramId}: ${existingRequest ? "found" : "not found"}`)
    }

    if (!existingRequest && phone) {
      existingRequest = getLatestAuthRequestByPhone(phone)
      console.log(`[v0] [update-request] By phone ${phone}: ${existingRequest ? "found" : "not found"}`)
    }

    if (!existingRequest) {
      console.log(`[v0] [update-request] Creating NEW request: phone=${phone}, telegramId=${telegramId}`)

      const newRequest = createAuthRequest({
        action: action || "send_phone",
        phone: phone,
        telegramId: telegramId,
        chatId: telegramId,
      })

      existingRequest = newRequest
      console.log(`[v0] [update-request] Created: ${newRequest.requestId}`)
    }

    updateAuthRequest(existingRequest.requestId, {
      status: status || existingRequest.status,
      message: message,
      error: error,
      processed: processed ?? true,
    })

    if (telegramId && phone) {
      linkUserPhone(telegramId, phone, status === "success" ? "active" : "verified")
    }

    console.log(`[v0] [update-request] SUCCESS: ${existingRequest.requestId} -> ${status}`)

    return NextResponse.json({
      success: true,
      requestId: existingRequest.requestId,
    })
  } catch (err) {
    console.error("[v0] [update-request] Error:", err)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
