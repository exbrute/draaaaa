"use client"

import { useState, useCallback } from "react"

// контекст
import AuthProvider from "./contexts/auth-context"


// layout компоненты
import Header from "../components/header"
import BottomNav from "../components/bottom-nav"

// модалки
import AuthModal from "../components/auth-modal"
import AccessDeniedModal from "../components/access-denied-modal"

// страницы
import MarketPage from "../components/pages/market-page"
import GiftsPage from "../components/pages/gifts-page"
import SeasonsPage from "../components/pages/seasons-page"
import PartnersPage from "../components/pages/partners-page"
import ProfilePage from "../components/pages/profile-page"

// splash
import SplashScreen from "../components/splash-screen"

export type TabType =
  | "market"
  | "gifts"
  | "seasons"
  | "partners"
  | "profile"

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>("market")
  const [showSplash, setShowSplash] = useState(true)

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
  }, [])

  const renderPage = () => {
    switch (activeTab) {
      case "market":
        return <MarketPage />
      case "gifts":
        return <GiftsPage />
      case "seasons":
        return <SeasonsPage />
      case "partners":
        return <PartnersPage />
      case "profile":
        return <ProfilePage />
      default:
        return <MarketPage />
    }
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />
  }

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 overflow-y-auto pb-24 hide-scrollbar">
        <div className="animate-slide-up">
          {renderPage()}
        </div>
      </main>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
      />

      <AuthModal />
      <AccessDeniedModal />
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
