"use client"

import { Gift, LogOut, ShoppingCart, Send, Diamond, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState, useCallback, memo, useMemo } from "react"
import { getNFTInfo, getRarityBgColor } from "@/lib/nft-collection"
import { WithdrawalAnimation } from "@/components/withdrawal-animation"
import { motion, AnimatePresence } from "framer-motion"
import { LottieGift } from "@/components/lottie-gift"

interface UserGift {
  id: string
  nftId: string
  collectionName: string
  collectionSlug: string
  phone: string
  telegramId: string
  receivedAt: number
  quantity: number
  metadata?: {
    giftName?: string
    rarity?: string
    imageUrl?: string
    animationUrl?: string
  }
}

const GiftCard = memo(
  function GiftCard({
    gift,
    index,
    onWithdraw,
    onClick,
  }: {
    gift: UserGift
    index: number
    onWithdraw: (gift: UserGift) => void
    onClick: () => void
  }) {
    const nftInfo = useMemo(() => getNFTInfo(gift.nftId), [gift.nftId])

    const imageUrl = useMemo(() => {
      if (gift.metadata?.imageUrl) return gift.metadata.imageUrl
      if (nftInfo?.imageUrl) return nftInfo.imageUrl
      return `https://nft.fragment.com/gift/${gift.collectionSlug}/${gift.nftId.split("-")[1] || "preview"}.webp`
    }, [gift.metadata?.imageUrl, gift.nftId, gift.collectionSlug, nftInfo])

    const animationUrl = useMemo(() => {
      if (gift.metadata?.animationUrl) return gift.metadata.animationUrl
      if (nftInfo?.animationUrl) return nftInfo.animationUrl
      return `https://nft.fragment.com/gift/${gift.collectionSlug}/${gift.nftId.split("-")[1] || "preview"}.json`
    }, [gift.metadata?.animationUrl, gift.nftId, gift.collectionSlug, nftInfo])

    const rarity = useMemo(() => {
      if (gift.metadata?.rarity) return gift.metadata.rarity
      return nftInfo?.rarity || "common"
    }, [gift.metadata?.rarity, nftInfo])

    const displayName = useMemo(() => {
      if (gift.metadata?.giftName) return gift.metadata.giftName
      return nftInfo?.giftName || gift.nftId
    }, [gift.metadata?.giftName, gift.nftId, nftInfo])

    const bgColor = useMemo(() => getRarityBgColor(rarity), [rarity])

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{
          delay: index * 0.02,
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="group"
      >
        <motion.div
          whileHover={{ scale: 1.05, y: -6 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className={`rounded-xl overflow-hidden border-2 border-border transition-all duration-300 ${bgColor} hover:border-pink-500/70 hover:shadow-2xl hover:shadow-pink-500/20 relative will-change-transform`}
        >
          {gift.quantity > 1 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-xs px-2.5 py-1 rounded-full min-w-[28px] text-center z-10 font-bold shadow-lg"
            >
              x{gift.quantity}
            </motion.div>
          )}

          <div onClick={onClick} className="aspect-square relative overflow-hidden cursor-pointer group/animation">
            <LottieGift animationUrl={animationUrl} fallbackImage={imageUrl} fullscreen />
            <div className="absolute inset-0 bg-gradient-to-t from-pink-500/20 via-transparent to-transparent opacity-0 group-hover/animation:opacity-100 transition-opacity duration-300" />
          </div>

          <div className="p-3 bg-card/80 backdrop-blur-md">
            <p className="text-sm text-center font-bold text-foreground truncate group-hover:text-pink-500 transition-colors duration-200">
              {gift.collectionName}
            </p>
            <p className="text-xs text-center text-muted-foreground truncate mb-3">{displayName}</p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                onWithdraw(gift)
              }}
              className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-lg py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 will-change-transform"
            >
              <LogOut className="w-4 h-4" />
              Вывести
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.gift.id === nextProps.gift.id &&
      prevProps.gift.quantity === nextProps.gift.quantity &&
      prevProps.index === nextProps.index
    )
  },
)

export function GiftsPage() {
  const { isAuthenticated, openAccessDenied, openAuthModal, telegramUser } = useAuth()
  const [gifts, setGifts] = useState<UserGift[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGift, setSelectedGift] = useState<UserGift | null>(null)
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  const fetchGifts = useCallback(async () => {
    if (!telegramUser?.id) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/user/gifts?telegramId=${telegramUser.id}`)
      const data = await res.json()

      if (data.success) {
        setGifts(data.gifts || [])
        setTotalCount(data.totalCount || 0)
      }
    } catch (error) {
      console.error("Error fetching gifts:", error)
    } finally {
      setIsLoading(false)
    }
  }, [telegramUser?.id])

  useEffect(() => {
    if (telegramUser?.id) {
      fetchGifts()
    }
  }, [telegramUser?.id, fetchGifts])

  const handleWithdraw = useCallback(
    async (gift: UserGift) => {
      if (!isAuthenticated) {
        openAuthModal()
        return
      }

      setSelectedGift(gift)
      setIsWithdrawing(true)

      try {
        const res = await fetch("/api/user/gifts/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegramId: telegramUser?.id,
            giftId: gift.id,
          }),
        })

        const data = await res.json()

        if (data.success) {
          setTimeout(() => {
            fetchGifts()
          }, 2000)
        }
      } catch (error) {
        console.error("Error withdrawing gift:", error)
      }
    },
    [isAuthenticated, openAuthModal, telegramUser?.id, fetchGifts],
  )

  const handleProtectedAction = useCallback(
    (action: string) => {
      if (!isAuthenticated) {
        openAccessDenied()
        return
      }
    },
    [isAuthenticated, openAccessDenied],
  )

  const handleGiftClick = useCallback(() => {
    // Animation plays automatically on click via LottieGift component
  }, [])

  return (
    <>
      <WithdrawalAnimation
        isOpen={isWithdrawing}
        onClose={() => {
          setIsWithdrawing(false)
          setSelectedGift(null)
        }}
        giftName={selectedGift ? selectedGift.metadata?.giftName || selectedGift.nftId : ""}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="px-4 py-4 space-y-4"
      >
        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex bg-card rounded-xl p-1 border border-border/50 shadow-lg"
        >
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600/40 to-blue-500/30 rounded-lg border border-blue-500/50 transition-all duration-300 shadow-md">
            <Gift className="w-4 h-4" />
            {totalCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
                className="bg-gradient-to-r from-pink-500 to-pink-600 text-white text-xs px-2 py-0.5 rounded-full min-w-[22px] text-center font-bold shadow-lg"
              >
                {totalCount}
              </motion.span>
            )}
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-muted-foreground transition-all duration-300 hover:bg-card/50 rounded-lg"
          >
            <Diamond className="w-4 h-4" />
          </motion.button>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-2"
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleProtectedAction("sell")}
            className="bg-card rounded-xl py-3 flex flex-col items-center gap-1 border border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 shadow-md"
          >
            <ShoppingCart className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Продать</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleProtectedAction("send")}
            className="bg-card rounded-xl py-3 flex flex-col items-center gap-1 border border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 shadow-md"
          >
            <Send className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Отправить</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleProtectedAction("withdraw")}
            className="bg-card rounded-xl py-3 flex flex-col items-center gap-1 border border-border/50 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all duration-300 shadow-md"
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Вывести</span>
          </motion.button>
        </motion.div>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center py-32"
          >
            <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
            <p className="text-muted-foreground mt-4">Загрузка подарков...</p>
          </motion.div>
        ) : gifts.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
            >
              {gifts.map((gift, index) => (
                <GiftCard
                  key={gift.id}
                  gift={gift}
                  index={index}
                  onWithdraw={handleWithdraw}
                  onClick={handleGiftClick}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center py-32"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
              className="w-20 h-20 border-2 border-pink-500/50 rounded-xl flex items-center justify-center mb-4"
            >
              <Gift className="w-10 h-10 text-muted-foreground" />
            </motion.div>
            <p className="text-muted-foreground">Подарков нет</p>
          </motion.div>
        )}
      </motion.div>
    </>
  )
}
