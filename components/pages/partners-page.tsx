"use client"

import { UserPlus, Users, Gift, Settings, Crown, Lock, ChevronRight } from "lucide-react"
import { useAuth, translations } from "@/contexts/auth-context"

const rewardTiers = [
  { friends: 5, points: "+50", icon: Gift, unlocked: true },
  { friends: 15, points: "+150", icon: Settings, unlocked: false },
  { friends: 30, points: "+300", icon: Crown, unlocked: false },
  { friends: 50, points: "+500", icon: Crown, unlocked: false },
]

export function PartnersPage() {
  const { isAuthenticated, openAccessDenied, language } = useAuth()
  const t = translations[language]

  const handleProtectedAction = (action: string) => {
    if (!isAuthenticated) {
      openAccessDenied()
      return
    }
    console.log(`Action: ${action}`)
  }

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header Card */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-5 flex flex-col items-center text-center border border-white/5">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-blue-500/30">
          <UserPlus className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">{t.partners}</h2>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          {language === "ru"
            ? "Приглашай друзей в маркет — получай баллы и бесплатные овнеры на подарки"
            : "Invite friends to the market — get points and free gift owners"}
        </p>
        <button
          onClick={() => handleProtectedAction("invite")}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors active-scale shadow-lg shadow-blue-500/20"
        >
          <UserPlus className="w-4 h-4" />
          {language === "ru" ? "Пригласить друзей" : "Invite friends"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-3.5 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{language === "ru" ? "Приглашено" : "Invited"}</p>
              <p className="text-xl font-bold text-foreground">0</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-3.5 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{language === "ru" ? "Баллов" : "Points"}</p>
              <p className="text-xl font-bold text-foreground">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Rewards */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
        <h3 className="font-semibold text-foreground text-sm mb-3">
          {language === "ru" ? "Прогресс наград" : "Reward Progress"}
        </h3>

        {/* Progress Bar */}
        <div className="relative mb-3">
          <div className="w-full h-1 bg-muted/30 rounded-full overflow-hidden">
            <div className="h-full w-[10%] bg-gradient-to-r from-pink-500 to-rose-500 rounded-full relative">
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>
          {/* Progress dots */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-0">
            {[0, 25, 50, 75, 100].map((pos, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full border-2 border-background ${i === 0 ? "bg-pink-500" : "bg-muted/50"}`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground mb-3">
          <span>5</span>
          <span>15</span>
          <span>30</span>
          <span>50</span>
        </div>

        <p className="text-xs text-muted-foreground">
          {language === "ru" ? "Текущий уровень:" : "Current level:"}{" "}
          <span className="text-cyan-400 font-semibold">{language === "ru" ? "Новичок" : "Beginner"}</span>
        </p>
      </div>

      {/* Reward Tiers - added onClick with auth check */}
      <div className="space-y-2">
        {rewardTiers.map((tier, index) => {
          const Icon = tier.icon
          return (
            <div
              key={index}
              onClick={() => handleProtectedAction(`tier-${tier.friends}`)}
              className={`bg-card/80 backdrop-blur-sm rounded-2xl p-3.5 flex items-center gap-3 border border-white/5 active-scale cursor-pointer ${tier.unlocked ? "opacity-100" : "opacity-60"}`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${tier.unlocked ? "bg-gradient-to-br from-cyan-500 to-blue-600" : "bg-muted/30"}`}
              >
                <Icon className={`w-5 h-5 ${tier.unlocked ? "text-white" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">
                  {tier.friends} {language === "ru" ? "друзей" : "friends"}
                </p>
                <p className="text-xs text-cyan-400">
                  {tier.points} {language === "ru" ? "баллов" : "points"}
                </p>
              </div>
              <div className="w-8 h-8 flex items-center justify-center">
                {tier.unlocked ? (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
