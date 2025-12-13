import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getGiftUrls(collectionName: string, giftId: string): { lottie: string; webp: string } {
  const urlMap: Record<string, string> = {
    "Plush Pepes": "plushpepe",
    "Ionic Dryers": "ionicdryer",
    "Artisan Bricks": "artisanbrick",
    "Astral Shards": "astralshard",
    "B-Day Candles": "bdaycandle",
    "Berry Boxes": "berrybox",
    "Big Years": "bigyear",
    "Bling Binkies": "blingbinky",
    "Bonded Rings": "bondedring",
    "Bow Ties": "bowtie",
    "Bunny Muffins": "bunnymuffin",
    "Candy Canes": "candycane",
    "Clover Pins": "cloverpin",
    "Crystal Balls": "crystalball",
    "Cupid Charms": "cupidcharm",
    "Desk Calendars": "deskcalendar",
    "Diamond Rings": "diamondring",
    "Durov's Caps": "durovscap",
    "Easter Eggs": "easteregg",
    "Electric Skulls": "electricskull",
    "Eternal Candles": "eternalcandle",
    "Eternal Roses": "eternalrose",
    "Evil Eyes": "evileye",
    "Faith Amulets": "faithamulet",
    "Fresh Socks": "freshsock",
    "Flying Brooms": "flyingbroom",
    "Gem Signets": "gemsignet",
    "Genie Lamps": "genielamp",
    "Ginger Cookies": "gingercookie",
    "Hanging Stars": "hangingstar",
    "Happy Brownies": "happybrownie",
    "Heart Lockets": "heartlocket",
    "Heroic Helmets": "heroichelmet",
    "Hex Pots": "hexpot",
    "Holiday Drinks": "holidaydrink",
    "Hypno Lollipops": "hypnolollipop",
    "Ice Creams": "icecream",
    "Jacks in the Box": "jackinthebox",
    "Jelly Bunnies": "jellybunny",
    "Jingle Bells": "jinglebell",
    "Kissed Frogs": "kissedfrog",
    "Light Swords": "lightsword",
    "Loot Bags": "lootbag",
    "Love Potions": "lovepotion",
    Lowriders: "lowrider",
    "Mad Pumpkins": "madpumpkin",
    "Magic Potions": "magicpotion",
    "Sakura Flowers": "sakuraflower",
    "Scared Cats": "scaredcat",
    "Skull Flowers": "skullflower",
    "Snow Globes": "snowglobe",
    "Snow Mittens": "snowmittens",
    "Snoop Doggs": "snoopdogg",
    "Stellar Rockets": "stellarrocket",
    "Swiss Watches": "swisswatch",
    "Toy Bears": "toybear",
    "Voodoo Dolls": "voodoodoll",
    "Witch Hats": "witchhat",
  }

  const slug = urlMap[collectionName] || collectionName.toLowerCase().replace(/[^a-z]/g, "")
  const id = giftId.replace("#", "")

  return {
    lottie: `https://nft.fragment.com/gift/${slug}-${id}.lottie.json`,
    webp: `https://nft.fragment.com/gift/${slug}-${id}.webp`,
  }
}
