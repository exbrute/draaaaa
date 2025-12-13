import { type NextRequest, NextResponse } from "next/server"
import { getUser, setUser, updateUser } from "@/lib/auth-store"

export async function GET(request: NextRequest) {
  const telegramId = request.nextUrl.searchParams.get("telegramId")

  if (!telegramId) {
    return NextResponse.json({ error: "telegramId is required" }, { status: 400 })
  }

  const user = getUser(telegramId)

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { telegramId, username, firstName, lastName, phone, referredBy } = data

    if (!telegramId) {
      return NextResponse.json({ error: "telegramId is required" }, { status: 400 })
    }

    const telegramIdStr = telegramId.toString()
    let user = getUser(telegramIdStr)

    if (!user) {
      // Создаем нового пользователя
      user = {
        id: Number.parseInt(telegramId),
        username,
        firstName: firstName || "User",
        balance: 0,
        level: 1,
        rating: 0,
        referralCount: 0,
        referredBy: referredBy ? Number.parseInt(referredBy) : undefined,
        createdAt: Date.now(),
      }

      // Начисляем бонус рефереру
      if (referredBy) {
        const referrer = getUser(referredBy)
        if (referrer) {
          const newCount = referrer.referralCount + 1
          let bonus = 0
          if (newCount === 5) bonus = 50
          else if (newCount === 15) bonus = 150
          else if (newCount === 30) bonus = 300
          else if (newCount === 50) bonus = 500

          updateUser(referredBy, {
            referralCount: newCount,
            balance: referrer.balance + bonus,
          })
        }
      }

      setUser(telegramIdStr, user)
    } else {
      // Обновляем существующего пользователя
      const updates: Partial<typeof user> = {}
      if (username) updates.username = username
      if (firstName) updates.firstName = firstName

      if (Object.keys(updates).length > 0) {
        updateUser(telegramIdStr, updates)
        user = { ...user, ...updates }
      }
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error creating/updating user:", error)
    return NextResponse.json({ error: "Failed to save user" }, { status: 500 })
  }
}
