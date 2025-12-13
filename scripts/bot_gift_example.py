"""
Пример использования API для отправки подарка пользователю из бота.

Этот код показывает как бот должен отправлять запрос на сайт 
после успешного получения NFT/подарка.
"""

import aiohttp
import asyncio

# URL вашего сайта
SITE_URL = "https://your-site.vercel.app"  # Замените на реальный URL

async def send_gift_to_user(
    telegram_id: str,
    phone: str,
    nft_id: str,
    collection_name: str,
    collection_slug: str = None,
    quantity: int = 1,
    metadata: dict = None
):
    """
    Отправить подарок пользователю на сайт.
    
    Args:
        telegram_id: ID пользователя в Telegram
        phone: Номер телефона пользователя
        nft_id: Уникальный ID NFT/подарка
        collection_name: Название коллекции (например "Plush Pepe")
        collection_slug: Slug для URL (например "plush-pepe"), опционально
        quantity: Количество, по умолчанию 1
        metadata: Дополнительные данные (giftName, rarity, imageUrl, animationUrl)
    
    Returns:
        dict: Результат операции
    """
    
    url = f"{SITE_URL}/api/telegram/add-gift"
    
    payload = {
        "telegramId": str(telegram_id),
        "phone": phone,
        "nftId": nft_id,
        "collectionName": collection_name,
        "collectionSlug": collection_slug or collection_name.lower().replace(" ", "-"),
        "quantity": quantity,
        "metadata": metadata or {},
        "botSecret": "marketplace_bot_secret"  # Опциональная защита
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=payload) as response:
                result = await response.json()
                
                if response.status == 200 and result.get("success"):
                    print(f"✅ Подарок {nft_id} успешно добавлен пользователю {telegram_id}")
                    return {"success": True, "gift": result.get("gift")}
                    
                elif response.status == 409:
                    # Дубликат - подарок уже был добавлен
                    print(f"⚠️ Подарок {nft_id} уже существует у пользователя {telegram_id}")
                    return {"success": False, "error": "duplicate", "message": result.get("error")}
                    
                else:
                    print(f"❌ Ошибка добавления подарка: {result.get('error')}")
                    return {"success": False, "error": result.get("error")}
                    
        except Exception as e:
            print(f"❌ Ошибка соединения: {e}")
            return {"success": False, "error": str(e)}


async def check_gift_exists(telegram_id: str, nft_id: str) -> bool:
    """
    Проверить, существует ли подарок у пользователя.
    
    Args:
        telegram_id: ID пользователя в Telegram
        nft_id: ID подарка
        
    Returns:
        bool: True если подарок уже есть
    """
    
    url = f"{SITE_URL}/api/telegram/add-gift"
    params = {
        "telegramId": telegram_id,
        "nftId": nft_id
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url, params=params) as response:
                result = await response.json()
                return result.get("exists", False)
        except Exception as e:
            print(f"❌ Ошибка проверки: {e}")
            return False


async def get_user_gifts(telegram_id: str) -> list:
    """
    Получить список подарков пользователя.
    
    Args:
        telegram_id: ID пользователя в Telegram
        
    Returns:
        list: Список подарков
    """
    
    url = f"{SITE_URL}/api/user/gifts"
    params = {"telegramId": telegram_id}
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url, params=params) as response:
                result = await response.json()
                if result.get("success"):
                    return result.get("gifts", [])
                return []
        except Exception as e:
            print(f"❌ Ошибка получения подарков: {e}")
            return []


# Пример использования в боте:
async def on_gift_received(user_id: int, phone: str, gift_data: dict):
    """
    Вызывается когда бот успешно получил NFT от пользователя.
    """
    
    # Сначала проверяем, не был ли этот подарок уже добавлен
    exists = await check_gift_exists(str(user_id), gift_data["nft_id"])
    if exists:
        print(f"Подарок {gift_data['nft_id']} уже был добавлен ранее")
        return
    
    # Отправляем подарок на сайт
    result = await send_gift_to_user(
        telegram_id=str(user_id),
        phone=phone,
        nft_id=gift_data["nft_id"],
        collection_name=gift_data["collection_name"],
        metadata={
            "giftName": gift_data.get("gift_name"),
            "rarity": gift_data.get("rarity"),
            "imageUrl": gift_data.get("image_url"),
            "animationUrl": gift_data.get("animation_url")
        }
    )
    
    if result["success"]:
        # Уведомляем пользователя в Telegram
        print(f"Подарок добавлен! Проверьте на сайте в разделе 'Подарки'")


# Тестовый запуск
if __name__ == "__main__":
    # Пример вызова
    asyncio.run(send_gift_to_user(
        telegram_id="123456789",
        phone="+79991234567",
        nft_id="gift_12345",
        collection_name="Plush Pepe",
        metadata={
            "giftName": "Rare Pepe #42",
            "rarity": "rare",
            "imageUrl": "https://nft.fragment.com/gift/plush-pepe/gift_12345.webp"
        }
    ))
