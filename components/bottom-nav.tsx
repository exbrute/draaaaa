"use client"

import { Store, Gift, Trophy, Users, User } from "lucide-react"
import { useAuth, translations } from "@/contexts/auth-context"
import type { TabType } from "@/app/page"
import { motion } from "framer-motion"
import { memo } from "react"

interface BottomNavProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}

const NavButton = memo(function NavButton({
  tab,
  isActive,
  onClick,
}: {
  tab: { id: TabType; label: string; icon: any }
  isActive: boolean
  onClick: () => void
}) {
  const Icon = tab.icon
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-300 touch-target ${
        isActive ? "text-white" : "text-muted-foreground"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl shadow-lg shadow-blue-500/30"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <motion.div
        animate={{
          scale: isActive ? 1.1 : 1,
          y: isActive ? -1 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Icon className="relative z-10 w-5 h-5" />
      </motion.div>
      <span className="relative z-10 text-[10px] font-medium">{tab.label}</span>
    </motion.button>
  )
})

export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const { language } = useAuth()
  const t = translations[language]

  const tabs = [
    { id: "market" as TabType, label: t.market, icon: Store },
    { id: "gifts" as TabType, label: t.gifts, icon: Gift },
    { id: "seasons" as TabType, label: t.seasons, icon: Trophy },
    { id: "partners" as TabType, label: t.partners, icon: Users },
    { id: "profile" as TabType, label: t.profile, icon: User },
  ]

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-xl border-t border-white/10 z-[100] shadow-2xl shadow-black/30"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex items-center justify-around py-2 px-2 max-w-md mx-auto">
        {tabs.map((tab) => (
          <NavButton key={tab.id} tab={tab} isActive={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
        ))}
      </div>
    </motion.nav>
  )
}
