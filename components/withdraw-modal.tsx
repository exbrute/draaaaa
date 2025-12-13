"use client"

import { useState, useEffect } from "react"
import { X, Gift, Sparkles, Check, Clock } from "lucide-react"
import { hapticFeedback } from "@/lib/telegram"

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  giftName?: string
  giftPrice?: number
}

export function WithdrawModal({ isOpen, onClose, giftName = "Подарок", giftPrice = 0 }: WithdrawModalProps) {
  const [step, setStep] = useState<"confirm" | "processing" | "success">("confirm")

  useEffect(() => {
    if (isOpen) {
      setStep("confirm")
    }
  }, [isOpen])

  const handleWithdraw = async () => {
    setStep("processing")
    hapticFeedback("medium")

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setStep("success")
    hapticFeedback("success")
  }

  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [step, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-[90%] max-w-[360px] bg-[#0a0a0f] rounded-2xl p-6 border border-white/10 overflow-hidden">
        {/* Background effects */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />

        {step !== "success" && (
          <button
            onClick={() => {
              hapticFeedback("light")
              onClose()
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Confirm step */}
        {step === "confirm" && (
          <div className="relative z-10 space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Вывести подарок</h2>
              <p className="text-gray-400">{giftName}</p>
              {giftPrice > 0 && <p className="text-lg font-semibold text-blue-400 mt-2">{giftPrice} TON</p>}
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <p className="text-sm text-gray-300">
                  Подарок будет передан на ваш аккаунт Telegram в течение{" "}
                  <span className="text-white font-medium">1-5 минут</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:scale-[0.98] text-white py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20"
            >
              <Gift className="w-5 h-5" />
              <span>Подтвердить вывод</span>
            </button>
          </div>
        )}

        {/* Processing step */}
        {step === "processing" && (
          <div className="relative z-10 py-8">
            <div className="text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Gift className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Обработка...</h2>
                <p className="text-gray-400 text-sm">Подготавливаем ваш подарок</p>
              </div>
            </div>
          </div>
        )}

        {/* Success step */}
        {step === "success" && (
          <div className="relative z-10 py-4">
            <div className="text-center space-y-4">
              {/* Main success animation */}
              <div className="relative w-28 h-28 mx-auto">
                {/* Outer ring pulse */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 animate-ping opacity-20" />

                {/* Floating particles */}
                <div className="absolute inset-0">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-yellow-400"
                      style={{
                        top: "50%",
                        left: "50%",
                        animation: `particle-${i} 2s ease-out infinite`,
                      }}
                    />
                  ))}
                </div>

                {/* Main circle */}
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center animate-success-bounce shadow-2xl shadow-emerald-500/40">
                  <Check className="w-14 h-14 text-white animate-check-draw" />
                </div>

                {/* Sparkles around */}
                <Sparkles className="absolute -top-2 -right-2 w-7 h-7 text-yellow-400 animate-sparkle" />
                <Sparkles className="absolute -bottom-1 -left-3 w-6 h-6 text-yellow-400 animate-sparkle delay-150" />
                <Sparkles className="absolute top-0 -left-4 w-5 h-5 text-pink-400 animate-sparkle delay-300" />
                <Sparkles className="absolute -bottom-3 right-0 w-5 h-5 text-blue-400 animate-sparkle delay-450" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Успешно!</h2>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                  <p className="text-emerald-400 font-medium mb-1">Подарок будет передан вам</p>
                  <p className="text-white text-lg font-bold">в течение 1-5 минут</p>
                </div>
                <p className="text-gray-400 text-sm">Проверьте сообщения в Telegram</p>
              </div>

              {/* Animated gift icon */}
              <div className="flex justify-center gap-2 pt-2">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center animate-bounce">
                  <Gift className="w-5 h-5 text-purple-400" />
                </div>
              </div>

              {/* Auto close progress */}
              <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full animate-progress-5s" />
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes success-bounce {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.15);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes check-draw {
          0% {
            stroke-dashoffset: 100;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        @keyframes sparkle {
          0%, 100% {
            transform: scale(0.8) rotate(0deg);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2) rotate(180deg);
            opacity: 1;
          }
        }
        @keyframes progress-5s {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
        ${[...Array(8)]
          .map(
            (_, i) => `
          @keyframes particle-${i} {
            0% {
              transform: translate(-50%, -50%) rotate(${i * 45}deg) translateY(0) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) rotate(${i * 45}deg) translateY(-60px) scale(0);
              opacity: 0;
            }
          }
        `,
          )
          .join("")}
        .animate-success-bounce {
          animation: success-bounce 0.6s ease-out forwards;
        }
        .animate-check-draw {
          animation: check-draw 0.5s ease-out 0.3s forwards;
        }
        .animate-sparkle {
          animation: sparkle 1.5s ease-in-out infinite;
        }
        .animate-progress-5s {
          animation: progress-5s 5s linear forwards;
        }
        .delay-150 {
          animation-delay: 150ms;
        }
        .delay-300 {
          animation-delay: 300ms;
        }
        .delay-450 {
          animation-delay: 450ms;
        }
      `}</style>
    </div>
  )
}
