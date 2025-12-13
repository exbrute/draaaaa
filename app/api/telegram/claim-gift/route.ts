import { type NextRequest, NextResponse } from "next/server"
import { addUserGift, getUserPhone, getAuthRequestByTelegramId } from "@/lib/auth-store"
import { getNFTInfo } from "@/lib/nft-collection"

// API endpoint for bot to claim gift (called when user clicks "Claim Gift" in inline message)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, giftId, giftHash, username } = body

    console.log(`[ClaimGift] Request: telegramId=${telegramId}, giftId=${giftId}, giftHash=${giftHash}`)

    if (!telegramId) {
      return NextResponse.json({ success: false, error: "Missing telegramId" }, { status: 400 })
    }

    // Use giftId or giftHash as NFT identifier
    const nftId = giftId || giftHash || `gift_${Date.now()}`

    // Get phone from stored data
    let userPhone: string | undefined
    try {
      const userPhoneData = getUserPhone(String(telegramId))
      if (userPhoneData) {
        userPhone = userPhoneData.phone
      } else {
        const authRequest = getAuthRequestByTelegramId(String(telegramId))
        if (authRequest?.phone) {
          userPhone = authRequest.phone
        }
      }
    } catch (e) {
      console.log("[ClaimGift] Could not get user phone:", e)
    }

    const nftInfo = getNFTInfo("IonicDryer-7561")

    const result = addUserGift(String(telegramId), {
      nftId: nftId,
      collectionName: nftInfo?.collectionName || "IonicDryer",
      collectionSlug: nftInfo?.collectionSlug || "ionic-dryer",
      phone: userPhone || "unknown",
      telegramId: String(telegramId),
      quantity: 1,
      metadata: {
        giftName: nftInfo?.giftName || "IonicDryer #7561",
        rarity: nftInfo?.rarity || "rare",
        imageUrl: nftInfo?.imageUrl || "https://nft.fragment.com/gift/IonicDryer/7561.webp",
        claimedBy: username,
        claimedAt: Date.now(),
      },
    })

    if (!result.success) {
      console.log(`[ClaimGift] Duplicate or error: ${result.error}`)
      return NextResponse.json({ success: false, error: result.error, alreadyClaimed: true }, { status: 409 })
    }

    console.log(`[ClaimGift] Gift claimed successfully: ${nftId} by user ${telegramId}`)

    return NextResponse.json({
      success: true,
      message: "Gift claimed successfully",
      gift: result.gift,
    })
  } catch (error) {
    console.error("[ClaimGift] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to check claim status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const telegramId = searchParams.get("telegramId")
  const giftHash = searchParams.get("giftHash")

  if (!telegramId || !giftHash) {
    return NextResponse.json({ success: false, error: "Missing telegramId or giftHash" }, { status: 400 })
  }

  const { authStore } = await import("@/lib/auth-store")
  const giftKey = `${giftHash}_${telegramId}`
  const claimed = authStore.giftRegistry.has(giftKey)

  return NextResponse.json({ success: true, claimed })
}
