"use client";

import { useEffect, useRef, useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
}

const CODE_LENGTH = 6;

export default function AuthModal({
  isOpen,
  onClose,
  onSubmit,
}: AuthModalProps) {
  const [code, setCode] = useState<string[]>(
    Array(CODE_LENGTH).fill("")
  );

  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // ✅ ФОКУС ПРИ ОТКРЫТИИ (ЭТО ГЛАВНЫЙ ФИКС)
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  const handleHiddenInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/\D/g, "");
    const chars = value.slice(0, CODE_LENGTH).split("");

    const newCode = [...Array(CODE_LENGTH)].map(
      (_, i) => chars[i] || ""
    );

    setCode(newCode);

    if (chars.length === CODE_LENGTH) {
      onSubmit(chars.join(""));
    }
  };

  const handleHiddenKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key !== "Backspace") return;

    setCode((prev) => {
      const next = [...prev];
      for (let i = CODE_LENGTH - 1; i >= 0; i--) {
        if (next[i]) {
          next[i] = "";
          break;
        }
      }
      return next;
    });
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();

    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    const chars = pasted.split("");

    setCode(
      [...Array(CODE_LENGTH)].map((_, i) => chars[i] || "")
    );

    if (chars.length === CODE_LENGTH) {
      onSubmit(chars.join(""));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-[320px] rounded-xl bg-white p-6">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 text-gray-500"
        >
          ✕
        </button>

        <h2 className="mb-4 text-center text-xl font-semibold">
          Введите код
        </h2>

        {/* 👇 КЛИК → ФОКУС (ВТОРОЙ ФИКС) */}
        <div
          className="mb-4 flex justify-center gap-2 cursor-text"
          onClick={() => hiddenInputRef.current?.focus()}
        >
          {code.map((digit, index) => (
            <div
              key={index}
              className="flex h-12 w-10 items-center justify-center rounded-md border text-lg font-mono"
            >
              {digit}
            </div>
          ))}
        </div>

        {/* СКРЫТЫЙ INPUT */}
        <input
          ref={hiddenInputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code.join("")}
          onChange={handleHiddenInputChange}
          onKeyDown={handleHiddenKeyDown}
          onPaste={handlePaste}
          className="absolute opacity-0"
        />
      </div>
    </div>
  );
}