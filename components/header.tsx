"use client"

import { Send, LogOut, User } from "lucide-react"
import { useAuth, translations } from "@/contexts/auth-context"
import { hapticFeedback } from "@/lib/telegram"

export function Header() {
  const { isAuthenticated, openAuthModal, logout, telegramUser, language } = useAuth()
  const t = translations[language]

  return (
    <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-50 bg-background/80 backdrop-blur-xl safe-top">
      <div className="text-xl font-black tracking-wider">
        <span className="bg-gradient-to-r from-pink-500 via-rose-400 to-pink-400 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]">
          MAR
        </span>
        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]">
          KET
        </span>
      </div>

      {isAuthenticated ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-green-500/20 text-green-400 pl-2 pr-3 py-1.5 rounded-full active-scale">
            {telegramUser?.photo_url ? (
              <img
                src={telegramUser.photo_url || "/placeholder.svg"}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-green-500/30 rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="text-sm font-medium max-w-[100px] truncate">{telegramUser?.first_name || "Online"}</span>
            {telegramUser?.is_premium && <span className="text-yellow-400 text-xs">⭐</span>}
          </div>
          <button
            onClick={() => {
              hapticFeedback("light")
              logout()
            }}
            className="p-2 text-gray-400 hover:text-white transition-colors active-scale touch-target"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            hapticFeedback("medium")
            openAuthModal()
          }}
          className="flex items-center gap-2 bg-[#2AABEE] hover:bg-[#229ED9] text-white px-4 py-2 rounded-full transition-all active-scale touch-target shadow-lg shadow-blue-500/20"
        >
          <Send className="w-4 h-4" />
          <span className="font-medium text-sm">{t.login}</span>
        </button>
      )}
    </header>
  )
}
