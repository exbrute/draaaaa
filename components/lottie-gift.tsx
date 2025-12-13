"use client"

import { useEffect, useRef, useState, useCallback, memo } from "react"
import lottie, { type AnimationItem } from "lottie-web"

interface LottieGiftProps {
  animationUrl: string
  fallbackImage?: string
  className?: string
  fullscreen?: boolean
}

export const LottieGift = memo(function LottieGift({
  animationUrl,
  fallbackImage,
  className = "",
  fullscreen = false,
}: LottieGiftProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<AnimationItem | null>(null)
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    setError(false)
    setIsLoading(true)

    try {
      animationRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: false,
        autoplay: true,
        path: animationUrl,
      })

      animationRef.current.addEventListener("complete", () => {
        setIsPlaying(false)
      })

      animationRef.current.addEventListener("DOMLoaded", () => {
        setIsLoading(false)
        setIsPlaying(true)
      })

      animationRef.current.addEventListener("data_failed", () => {
        setError(true)
        setIsLoading(false)
      })
    } catch (e) {
      setError(true)
      setIsLoading(false)
    }

    return () => {
      animationRef.current?.destroy()
      animationRef.current = null
    }
  }, [animationUrl])

  const handleClick = useCallback(() => {
    if (animationRef.current && !isPlaying) {
      animationRef.current.goToAndPlay(0)
      setIsPlaying(true)
    }
  }, [isPlaying])

  if (error && fallbackImage) {
    return (
      <div className={`${fullscreen ? "absolute inset-0 w-full h-full" : "w-full h-full"} ${className}`}>
        <img
          src={fallbackImage || "/placeholder.svg"}
          alt="Gift"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    )
  }

  if (error) {
    return null
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`
        ${fullscreen ? "absolute inset-0 w-full h-full" : "w-full h-full"} 
        ${className}
        ${!isPlaying && !isLoading ? "cursor-pointer" : ""}
        [&_svg]:w-full [&_svg]:h-full [&_svg]:object-contain
      `}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
})
