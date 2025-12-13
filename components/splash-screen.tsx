"use client"

import { useEffect, useState } from "react"

interface SplashScreenProps {
  onFinish: () => void
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter")

  useEffect(() => {
    // Enter animation
    const timer1 = setTimeout(() => setPhase("show"), 100)
    // Exit animation
    const timer2 = setTimeout(() => setPhase("exit"), 1800)
    // Finish
    const timer3 = setTimeout(() => onFinish(), 2300)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [onFinish])

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-pink-600/30 via-purple-600/30 to-blue-600/30 blur-[120px] animate-pulse" />
      </div>

      {/* Logo */}
      <div
        className={`relative flex flex-col items-center transition-all duration-700 ${
          phase === "enter" ? "scale-50 opacity-0" : "scale-100 opacity-100"
        } ${phase === "exit" ? "scale-110" : ""}`}
      >
        {/* MARKET text with gradient and glow */}
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight relative">
          <span className="bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]">
            MAR
          </span>
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]">
            KET
          </span>
          {/* Glow effect */}
          <span className="absolute inset-0 blur-2xl opacity-50 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            MARKET
          </span>
        </h1>

        {/* Animated dots */}
        <div className="flex items-center gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500"
              style={{
                animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Loading text */}
        <p
          className={`mt-4 text-sm text-muted-foreground transition-opacity duration-500 ${
            phase === "show" ? "opacity-100" : "opacity-0"
          }`}
        >
          Loading...
        </p>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  )
}
