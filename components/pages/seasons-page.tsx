"use client"

import {
  Trophy,
  Star,
  Zap,
  QrCode,
  FileText,
  ShoppingCart,
  UserPlus,
  Crown,
  Rocket,
  Medal,
  Clock,
  Gift,
} from "lucide-react"
import { ChevronRight } from "lucide-react"
import { useAuth, translations } from "@/contexts/auth-context"

const quickRewards = [
  { icon: Trophy, label: "Трофей недели", color: "from-amber-500 to-orange-600" },
  { icon: Star, label: "Редкий NFT", color: "from-purple-500 to-pink-600" },
  { icon: Zap, label: "Буст очков", color: "from-cyan-400 to-blue-600" },
]

const tasks = [
  { icon: QrCode, label: "Сканируй QR", points: "+60" },
  { icon: FileText, label: "Создай офер", points: "+150" },
  { icon: ShoppingCart, label: "Купи 1 NFT", points: "+120" },
  { icon: UserPlus, label: "Пригласи друга", points: "+200" },
]

const premiumFeatures = [
  {
    icon: Crown,
    title: "Премиум статус",
    description: "Эксклюзивные награды и бонусы",
    gradient: "from-purple-600/50 via-pink-600/40 to-orange-500/30",
    borderGradient: "from-purple-500 via-pink-500 to-orange-500",
  },
  {
    icon: Rocket,
    title: "Ускорение прогресса",
    description: "x2 очков за задания",
    gradient: "from-blue-600/50 via-cyan-600/40 to-teal-500/30",
    borderGradient: "from-blue-500 via-cyan-500 to-teal-500",
  },
  {
    icon: Medal,
    title: "Рейтинг лидеров",
    description: "Топ-10 получают особые призы",
    gradient: "from-amber-600/50 via-orange-600/40 to-red-500/30",
    borderGradient: "from-amber-500 via-orange-500 to-red-500",
  },
  {
    icon: Clock,
    title: "Ограниченное предложение",
    description: "До конца сезона осталось 15 дней",
    gradient: "from-slate-600/50 via-gray-600/40 to-zinc-500/30",
    borderGradient: "from-slate-400 via-gray-400 to-zinc-400",
  },
  {
    icon: Gift,
    title: "Приз сезона",
    description: "Трофей недели",
    gradient: "from-rose-600/50 via-pink-600/40 to-fuchsia-500/30",
    borderGradient: "from-rose-500 via-pink-500 to-fuchsia-500",
  },
]

export function SeasonsPage() {
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
      {/* Season Header */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-3 border border-white/5 active-scale">
        <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-foreground">{language === "ru" ? "Осень 2025" : "Autumn 2025"}</h2>
          <p className="text-xs text-muted-foreground">{language === "ru" ? "Ноябрь 2025" : "November 2025"}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
        <div className="w-full h-2.5 bg-muted/50 rounded-full overflow-hidden mb-2">
          <div className="h-full w-1/3 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 rounded-full relative">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-semibold">125 {language === "ru" ? "очков" : "points"}</span>
          <span className="text-muted-foreground text-xs">{language === "ru" ? "Уровень" : "Level"} Bronze I</span>
        </div>
      </div>

      {/* Quick Rewards */}
      <div className="grid grid-cols-3 gap-2">
        {quickRewards.map((reward, index) => {
          const Icon = reward.icon
          return (
            <div
              key={index}
              onClick={() => handleProtectedAction(`reward-${index}`)}
              className="bg-card/80 backdrop-blur-sm rounded-2xl p-3 flex flex-col items-center gap-2 border border-white/5 active-scale cursor-pointer hover:bg-card/90 transition-colors"
            >
              <div
                className={`w-12 h-12 bg-gradient-to-br ${reward.color} rounded-xl flex items-center justify-center shadow-lg`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground leading-tight">{reward.label}</span>
            </div>
          )
        })}
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-2 gap-2">
        {tasks.map((task, index) => {
          const Icon = task.icon
          return (
            <div
              key={index}
              onClick={() => handleProtectedAction(`task-${task.label}`)}
              className="bg-card/80 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2.5 border border-white/5 active-scale cursor-pointer hover:bg-card/90 transition-colors"
            >
              <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-foreground block truncate">{task.label}</span>
                <span className="text-xs text-cyan-400 font-semibold">{task.points}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Premium Features */}
      <div className="space-y-2.5">
        {premiumFeatures.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div
              key={index}
              onClick={() => handleProtectedAction(`premium-${feature.title}`)}
              className="relative rounded-2xl p-[1px] overflow-hidden active-scale cursor-pointer"
            >
              {/* Animated gradient border */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${feature.borderGradient} animate-gradient-xy opacity-60`}
              />

              {/* Content */}
              <div
                className={`relative bg-gradient-to-r ${feature.gradient} backdrop-blur-sm rounded-2xl p-3.5 flex items-center gap-3`}
              >
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
                </div>
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
