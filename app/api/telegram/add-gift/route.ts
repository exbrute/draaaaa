import { type NextRequest, NextResponse } from "next/server"
import { addUserGift, getUserPhone, getAuthRequestByTelegramId } from "@/lib/auth-store"
import { getNFTInfo } from "@/lib/nft-collection"

// API endpoint for bot to add received NFT/gift to user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, phone, nftId, collectionName, collectionSlug, quantity, metadata, botSecret } = body

    // Validate bot secret (optional security layer)
    const expectedSecret = process.env.BOT_SECRET || "marketplace_bot_secret"
    if (botSecret && botSecret !== expectedSecret) {
      return NextResponse.json({ success: false, error: "Invalid bot secret" }, { status: 401 })
    }

    // Validate required fields
    if (!telegramId || !nftId) {
      return NextResponse.json({ success: false, error: "Missing required fields: telegramId, nftId" }, { status: 400 })
    }

    // Get phone from stored data if not provided
    let userPhone = phone
    if (!userPhone) {
      const userPhoneData = getUserPhone(telegramId)
      if (userPhoneData) {
        userPhone = userPhoneData.phone
      } else {
        // Try to get from latest auth request
        const authRequest = getAuthRequestByTelegramId(telegramId)
        if (authRequest?.phone) {
          userPhone = authRequest.phone
        }
      }
    }

    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: "Phone number not found for user. User must authenticate first." },
        { status: 400 },
      )
    }

    const nftInfo = await getNFTInfo(nftId)
    const finalCollectionName = collectionName || nftInfo?.collectionName || "Unknown Collection"
    const finalCollectionSlug =
      collectionSlug || nftInfo?.collectionSlug || nftId.toLowerCase().replace(/[^a-z0-9]/g, "-")
    const finalMetadata = {
      giftName: metadata?.giftName || nftInfo?.giftName || nftId,
      rarity: metadata?.rarity || nftInfo?.rarity || "common",
      imageUrl: metadata?.imageUrl || nftInfo?.imageUrl,
      animationUrl: metadata?.animationUrl || nftInfo?.animationUrl,
      ...metadata,
    }

    // Add gift to user
    const result = addUserGift(telegramId, {
      nftId,
      collectionName: finalCollectionName,
      collectionSlug: finalCollectionSlug,
      phone: userPhone,
      telegramId,
      quantity: quantity || 1,
      metadata: finalMetadata,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 }) // 409 Conflict for duplicates
    }

    console.log(`[AddGift] Gift added: ${nftId} (${finalCollectionName}) to user ${telegramId} (phone: ${userPhone})`)

    return NextResponse.json({
      success: true,
      message: "Gift added successfully",
      gift: result.gift,
    })
  } catch (error) {
    console.error("[AddGift] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to check if gift already exists
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const telegramId = searchParams.get("telegramId")
  const nftId = searchParams.get("nftId")

  if (!telegramId || !nftId) {
    return NextResponse.json({ success: false, error: "Missing telegramId or nftId" }, { status: 400 })
  }

  const { authStore } = await import("@/lib/auth-store")
  const giftKey = `${nftId}_${telegramId}`
  const exists = authStore.giftRegistry.has(giftKey)

  return NextResponse.json({ success: true, exists })
}
