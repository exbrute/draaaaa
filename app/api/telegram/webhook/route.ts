import { type NextRequest, NextResponse } from "next/server"
import {
  setVerificationCode,
  generateCode,
  getVerificationCode,
  deleteVerificationCode,
  createSession,
  getUser,
  setUser,
  updateUser,
} from "@/lib/auth-store"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8597794987:AAFyKeMrseSzAEDOpqW6bjpiCx2VRq78zh0"
const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://v0-marketplacewebapp-vert.vercel.app"

async function sendMessage(chatId: number | string, text: string, replyMarkup?: object) {
  const data: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  }

  if (replyMarkup) {
    data.reply_markup = replyMarkup
  }

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

function getWebAppKeyboard() {
  return {
    inline_keyboard: [[{ text: "🛍 Открыть Маркет", web_app: { url: WEBAPP_URL } }]],
  }
}

function getContactKeyboard() {
  return {
    keyboard: [[{ text: "📱 Поделиться номером", request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  }
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()

    if (update.message) {
      const message = update.message
      const chatId = message.chat.id
      const user = message.from || {}
      const text = message.text || ""
      const chatIdStr = chatId.toString()

      let userData = getUser(chatIdStr)
      if (!userData) {
        userData = {
          id: chatId,
          username: user.username,
          firstName: user.first_name || "User",
          balance: 0,
          level: 1,
          rating: 0,
          referralCount: 0,
          createdAt: Date.now(),
        }
        setUser(chatIdStr, userData)
      }

      // Обработка контакта
      if (message.contact) {
        const phone = message.contact.phone_number
        const code = generateCode()
        setVerificationCode(chatIdStr, code, phone, "bot")

        await sendMessage(
          chatId,
          `📱 *Номер получен!*\n\nТелефон: \`${phone}\`\n\n🔑 *Ваш код:* \`${code}\`\n\nВведите код в приложении.`,
          { remove_keyboard: true },
        )

        setTimeout(() => {
          sendMessage(chatId, "Откройте маркет и введите код:", getWebAppKeyboard())
        }, 500)

        return NextResponse.json({ ok: true })
      }

      // Обработка данных от WebApp
      if (message.web_app_data) {
        const data = JSON.parse(message.web_app_data.data || "{}")

        if (data.action === "verify_code") {
          const stored = getVerificationCode(chatIdStr)
          if (stored && stored.code === data.code) {
            deleteVerificationCode(chatIdStr)
            createSession(chatIdStr, stored.phone)
            await sendMessage(
              chatId,
              "✅ *Авторизация успешна!*\n\nДобро пожаловать в MARKETPLACE!",
              getWebAppKeyboard(),
            )
          } else {
            await sendMessage(chatId, "❌ Неверный код. Попробуйте снова.")
          }
        } else if (data.action === "purchase") {
          const itemName = data.item || "NFT"
          const price = data.price || 0
          await sendMessage(chatId, `🎉 *Покупка успешна!*\n\nВы приобрели: ${itemName}\nЦена: ${price} TON`)
        }

        return NextResponse.json({ ok: true })
      }

      // Команды
      if (text.startsWith("/start")) {
        const firstName = user.first_name || "Друг"
        const refMatch = text.match(/ref_(\d+)/)

        if (refMatch && !userData.referredBy) {
          const referrerId = refMatch[1]
          if (referrerId !== chatIdStr) {
            updateUser(chatIdStr, { referredBy: Number.parseInt(referrerId) })

            const referrer = getUser(referrerId)
            if (referrer) {
              const newCount = referrer.referralCount + 1
              let bonus = 0
              if (newCount === 5) bonus = 50
              else if (newCount === 15) bonus = 150
              else if (newCount === 30) bonus = 300
              else if (newCount === 50) bonus = 500

              updateUser(referrerId, {
                referralCount: newCount,
                balance: referrer.balance + bonus,
              })

              if (bonus > 0) {
                await sendMessage(
                  Number.parseInt(referrerId),
                  `🎉 *Новый реферал!*\n\n${firstName} присоединился по вашей ссылке.\n\n💰 Бонус: +${bonus} баллов`,
                )
              }
            }
          }
        }

        await sendMessage(
          chatId,
          `👋 Привет, *${firstName}*!\n\nДобро пожаловать в *MARKETPLACE* — твой NFT маркетплейс в Telegram!\n\n🎁 *Что тебя ждет:*\n• Покупай и продавай NFT подарки\n• Участвуй в сезонных событиях\n• Приглашай друзей и получай бонусы\n• Зарабатывай TON\n\nНажми кнопку ниже 👇`,
          getWebAppKeyboard(),
        )
      } else if (text === "/help") {
        await sendMessage(
          chatId,
          "📚 *Справка*\n\n/start - Запустить бота\n/market - Открыть маркет\n/profile - Профиль\n/referral - Реферальная программа\n/auth - Авторизация",
          getWebAppKeyboard(),
        )
      } else if (text === "/market") {
        await sendMessage(chatId, "🛍 Открой маркетплейс:", getWebAppKeyboard())
      } else if (text === "/profile") {
        const profile = getUser(chatIdStr)
        await sendMessage(
          chatId,
          `👤 *Твой профиль*\n\n💰 Баланс: *${profile?.balance || 0}* баллов\n🔥 Уровень: *${profile?.level || 1}*\n⭐ Рейтинг: *${profile?.rating || 0}*`,
          {
            inline_keyboard: [[{ text: "👤 Открыть профиль", web_app: { url: `${WEBAPP_URL}?tab=profile` } }]],
          },
        )
      } else if (text === "/referral") {
        const botInfo = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`).then((r) => r.json())
        const botUsername = botInfo.result?.username || "MarketplaceBot"
        const refLink = `https://t.me/${botUsername}?start=ref_${chatId}`
        const refCount = userData?.referralCount || 0

        await sendMessage(
          chatId,
          `👥 *Реферальная программа*\n\n🔗 *Твоя ссылка:*\n\`${refLink}\`\n\n📊 *Статистика:*\n• Приглашено: *${refCount}* друзей\n\n💰 *Награды:*\n• 5 друзей → +50 баллов\n• 15 друзей → +150 баллов\n• 30 друзей → +300 баллов\n• 50 друзей → +500 баллов`,
          {
            inline_keyboard: [
              [{ text: "📤 Поделиться", switch_inline_query: `Присоединяйся к MARKETPLACE! ${refLink}` }],
              [{ text: "👥 Партнеры", web_app: { url: `${WEBAPP_URL}?tab=partners` } }],
            ],
          },
        )
      } else if (text === "/auth") {
        await sendMessage(chatId, "🔐 *Авторизация*\n\nДля входа поделитесь номером телефона 👇", getContactKeyboard())
      } else {
        await sendMessage(chatId, "👋 Используй кнопку ниже:", getWebAppKeyboard())
      }
    }

    if (update.callback_query) {
      const callback = update.callback_query
      const chatId = callback.message?.chat?.id
      const data = callback.data

      // Отвечаем на callback чтобы убрать loading
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callback.id }),
      })

      if (data === "auth" && chatId) {
        await sendMessage(chatId, "🔐 *Авторизация*\n\nДля входа поделитесь номером телефона 👇", getContactKeyboard())
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ ok: true })
  }
}
