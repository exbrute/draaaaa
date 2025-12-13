"use client"

import { useEffect, useState } from "react"
import { Gift, Sparkles, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface WithdrawalAnimationProps {
  isOpen: boolean
  onClose: () => void
  giftName: string
}

export function WithdrawalAnimation({ isOpen, onClose, giftName }: WithdrawalAnimationProps) {
  const [stage, setStage] = useState<"processing" | "success">("processing")

  useEffect(() => {
    if (isOpen) {
      setStage("processing")
      // Simulate withdrawal process
      const timer = setTimeout(() => {
        setStage("success")
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    if (stage === "success") {
      const timer = setTimeout(() => {
        onClose()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [stage, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      >
        <div className="relative">
          {stage === "processing" ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  rotate: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                  scale: { duration: 1, repeat: Number.POSITIVE_INFINITY },
                }}
                className="relative"
              >
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500/20 to-blue-500/20 border-2 border-pink-500/50 flex items-center justify-center">
                  <Gift className="w-16 h-16 text-pink-500" />
                </div>

                {/* Sparkles around the gift */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.2,
                    }}
                    className="absolute"
                    style={{
                      left: `${50 + 50 * Math.cos((i * Math.PI) / 4)}%`,
                      top: `${50 + 50 * Math.sin((i * Math.PI) / 4)}%`,
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-blue-400" />
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                className="text-center"
              >
                <h3 className="text-xl font-semibold text-white mb-2">Выводим подарок...</h3>
                <p className="text-white/60 text-sm">{giftName}</p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="flex flex-col items-center gap-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 flex items-center justify-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500" />
                </div>

                {/* Success sparkles */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{
                      scale: [0, 1, 0],
                      x: Math.cos((i * Math.PI) / 6) * 100,
                      y: Math.sin((i * Math.PI) / 6) * 100,
                      opacity: [0, 1, 0],
                    }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="absolute left-1/2 top-1/2"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <h3 className="text-xl font-semibold text-white mb-2">Ваш подарок будет скоро выведен</h3>
                <p className="text-white/60 text-sm">Проверьте свой Telegram</p>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
