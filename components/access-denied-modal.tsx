"use client"

import { X, ShieldCheck, Send } from "lucide-react"
import { useAuth, translations } from "@/contexts/auth-context"

export function AccessDeniedModal() {
  const { isAccessDeniedOpen, closeAccessDenied, openAuthModal, language } = useAuth()
  const t = translations[language]

  const handleAuthorize = () => {
    closeAccessDenied()
    openAuthModal()
  }

  if (!isAccessDeniedOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-[90%] max-w-[360px] bg-[#0a0a0f] rounded-2xl p-6 border border-white/10">
        <button
          onClick={closeAccessDenied}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center text-green-400 mb-2">{t.accessDenied}</h2>
        <p className="text-center text-gray-400 text-sm mb-6">{t.authRequired}</p>

        <button
          onClick={handleAuthorize}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3.5 rounded-xl font-medium transition-colors active-scale"
        >
          <Send className="w-5 h-5" />
          <span>{t.authorize}</span>
        </button>
      </div>
    </div>
  )
}
