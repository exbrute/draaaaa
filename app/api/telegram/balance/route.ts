import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const chatId = searchParams.get("chatId")

    const id = userId || chatId
    if (!id) {
      return NextResponse.json({ error: "Missing userId or chatId" }, { status: 400 })
    }

    const balance = await db.getUserBalance(id)
    const user = await db.getUser(id)

    return NextResponse.json({
      balance,
      user,
      userId: id,
    })
  } catch (error) {
    console.error("[v0] Error fetching balance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN

    if (!botToken || authHeader !== `Bearer ${botToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, chatId, amount, operation } = body

    const id = userId || chatId
    if (!id || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const newBalance = await db.updateBalance(id, amount, operation || "add")

    return NextResponse.json({
      success: true,
      newBalance,
      userId: id,
    })
  } catch (error) {
    console.error("[v0] Error updating balance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
