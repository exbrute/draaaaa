"use client"

import { Flame, Star, Gift, CheckSquare, Percent, FileText, Globe, ChevronRight } from "lucide-react"
import { TonIcon } from "@/components/ton-icon"
import { AnimatedCard } from "@/components/animated-card"
import { useAuth, translations } from "@/contexts/auth-context"

export function ProfilePage() {
  const { telegramUser, userStats, language, setLanguage, isAuthenticated, openAccessDenied } = useAuth()
  const t = translations[language]

  const handleProtectedAction = (action: string) => {
    if (!isAuthenticated) {
      openAccessDenied()
      return
    }
    console.log(`Action: ${action}`)
  }

  const menuItems = [
    {
      icon: Gift,
      title: t.weeklyBonus,
      description: t.weeklyBonusDesc,
      gradient: "from-purple-600 via-pink-500 to-rose-500",
    },
    {
      icon: CheckSquare,
      title: t.dailyTasks,
      description: t.dailyTasksDesc,
      gradient: "from-blue-600 via-cyan-500 to-teal-400",
    },
    {
      icon: Percent,
      title: t.weeklyDiscount,
      description: t.weeklyDiscountDesc,
      gradient: "from-amber-500 via-orange-500 to-yellow-400",
    },
  ]

  const displayName = telegramUser?.first_name
    ? `${telegramUser.first_name}${telegramUser.last_name ? ` ${telegramUser.last_name}` : ""}`
    : t.user
  const username = telegramUser?.username ? `@${telegramUser.username}` : ""
  const avatarUrl = telegramUser?.photo_url

  const toggleLanguage = () => {
    setLanguage(language === "ru" ? "en" : "ru")
  }

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center relative">
        <div className="absolute top-0 right-0">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/5 active-scale"
          >
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase">{language}</span>
          </button>
        </div>

        <div className="relative w-20 h-20 mb-3">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 rounded-full animate-pulse-slow" />
          <div className="absolute inset-[3px] bg-background rounded-full" />
          {avatarUrl ? (
            <img
              src={avatarUrl || "/placeholder.svg"}
              alt={displayName}
              width={74}
              height={74}
              className="absolute inset-[3px] w-[74px] h-[74px] rounded-full object-cover"
            />
          ) : (
            <div className="absolute inset-[3px] bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
        {username && <p className="text-xs text-muted-foreground">{username}</p>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-3 w-full bg-card/80 backdrop-blur-sm rounded-2xl p-3 border border-white/5">
          {[
            { label: t.volume, value: userStats.volume.toString() },
            { label: t.bought, value: userStats.bought.toString() },
            { label: t.sold, value: userStats.sold.toString() },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Balance Card - added onClick handlers with auth check */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <TonIcon className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{t.balance}</p>
            <p className="text-lg font-bold text-foreground">0.00 TON</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() => handleProtectedAction("deposit")}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors active-scale"
          >
            <span>💳</span>
            {t.deposit}
          </button>
          <button
            onClick={() => handleProtectedAction("withdraw")}
            className="bg-transparent border border-pink-500/50 text-pink-400 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors active-scale hover:bg-pink-500/10"
          >
            <FileText className="w-4 h-4" />
            {t.withdraw}
          </button>
        </div>

        <button
          onClick={() => handleProtectedAction("history")}
          className="w-full bg-muted/30 py-2.5 rounded-xl text-foreground text-sm font-medium flex items-center justify-center gap-2 active-scale hover:bg-muted/50 transition-colors"
        >
          <FileText className="w-4 h-4" />
          {t.history}
        </button>
      </div>

      {/* Level & Rating */}
      <div className="space-y-2">
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-3.5 flex items-center gap-4 border border-white/5">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                className="text-cyan-500/20"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="url(#levelGradient)"
                strokeWidth="3"
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray="150.8"
                strokeDashoffset={150.8 - (userStats.level / 100) * 150.8}
                className="animate-pulse-slow"
              />
              <defs>
                <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Flame className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.level}</p>
            <p className="text-xl font-bold text-foreground">{userStats.level}</p>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-3.5 flex items-center gap-4 border border-white/5">
          <div className="w-11 h-11 flex items-center justify-center">
            <Star className="w-9 h-9 text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.rating}</p>
            <p className="text-xl font-bold text-foreground">{userStats.rating.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Menu Items - added onClick handlers with auth check */}
      <div className="space-y-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <AnimatedCard key={index} gradient={item.gradient}>
              <div
                onClick={() => handleProtectedAction(`menu-${item.title}`)}
                className="p-3 flex items-center gap-3 cursor-pointer"
              >
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Icon className="w-4 h-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </AnimatedCard>
          )
        })}
      </div>
    </div>
  )
}
