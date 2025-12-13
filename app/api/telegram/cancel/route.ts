import { type NextRequest, NextResponse } from "next/server"
import { getAuthRequest, updateAuthRequest } from "@/lib/auth-store"

export async function POST(request: NextRequest) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }

  try {
    const body = await request.json()
    const { requestId } = body

    console.log("[CANCEL] Cancel request received:", { requestId })

    if (!requestId) {
      return NextResponse.json(
        {
          success: false,
          error: "requestId required",
        },
        { status: 400, headers },
      )
    }

    const existingRequest = getAuthRequest(requestId)

    if (existingRequest) {
      updateAuthRequest(requestId, {
        status: "cancelled",
        message: "Авторизация отменена пользователем",
        processed: true,
      })

      console.log(`[CANCEL] Marked request ${requestId} as cancelled`)

      return NextResponse.json(
        {
          success: true,
          message: "Авторизация отменена",
        },
        { headers },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Запрос не найден",
      },
      { status: 404, headers },
    )
  } catch (error) {
    console.error("[CANCEL] Error processing cancellation:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Ошибка сервера",
      },
      { status: 500, headers },
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  )
}
