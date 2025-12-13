"use client"

import type { ReactNode } from "react"

interface AnimatedCardProps {
  children: ReactNode
  gradient?: string
  className?: string
  onClick?: () => void
}

export function AnimatedCard({
  children,
  gradient = "from-purple-500 via-pink-500 to-orange-500",
  className = "",
}: AnimatedCardProps) {
  return (
    <div className={`relative group ${className}`}>
      {/* Animated gradient border */}
      <div
        className={`absolute -inset-[1px] bg-gradient-to-r ${gradient} rounded-2xl opacity-75 blur-sm group-hover:opacity-100 transition-opacity duration-500 animate-gradient-xy`}
      />
      <div
        className={`absolute -inset-[1px] bg-gradient-to-r ${gradient} rounded-2xl opacity-50 animate-gradient-xy`}
      />
      {/* Content */}
      <div className="relative bg-[#1a1a2e] rounded-2xl">{children}</div>
    </div>
  )
}
