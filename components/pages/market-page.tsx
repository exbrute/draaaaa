"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo, memo, useCallback } from "react"
import { Gift, ChevronDown, Check, SlidersHorizontal, X, Sparkles } from "lucide-react"
import { TonIcon } from "@/components/ton-icon"
import { useAuth, translations } from "@/contexts/auth-context"
import { LottieGift } from "@/components/lottie-gift"
import { motion } from "framer-motion"

// Add the missing getGiftUrls import
import { getGiftUrls } from "@/lib/utils"

// Define SortType enum
enum SortType {
  none = "none",
  "price-asc" = "price-asc",
  "price-desc" = "price-desc",
  "id-asc" = "id-asc",
  "id-desc" = "id-desc",
}

const collections = [
  { name: "all", displayRu: "Все", displayEn: "All", items: null },
  { name: "Ionic Dryers", displayRu: "Ionic Dryers", displayEn: "Ionic Dryers", items: 2 },
  { name: "Artisan Bricks", displayRu: "Artisan Bricks", displayEn: "Artisan Bricks", items: 1163 },
  { name: "Astral Shards", displayRu: "Astral Shards", displayEn: "Astral Shards", items: 2181 },
  { name: "B-Day Candles", displayRu: "B-Day Candles", displayEn: "B-Day Candles", items: 16749 },
  { name: "Berry Boxes", displayRu: "Berry Boxes", displayEn: "Berry Boxes", items: 7194 },
  { name: "Big Years", displayRu: "Big Years", displayEn: "Big Years", items: 6828 },
  { name: "Bling Binkies", displayRu: "Bling Binkies", displayEn: "Bling Binkies", items: 250 },
  { name: "Bonded Rings", displayRu: "Bonded Rings", displayEn: "Bonded Rings", items: 2000 },
  { name: "Bow Ties", displayRu: "Bow Ties", displayEn: "Bow Ties", items: 5000 },
  { name: "Bunny Muffins", displayRu: "Bunny Muffins", displayEn: "Bunny Muffins", items: 5000 },
  { name: "Candy Canes", displayRu: "Candy Canes", displayEn: "Candy Canes", items: 7874 },
  { name: "Clover Pins", displayRu: "Clover Pins", displayEn: "Clover Pins", items: 8523 },
  { name: "Crystal Balls", displayRu: "Crystal Balls", displayEn: "Crystal Balls", items: 6480 },
  { name: "Cupid Charms", displayRu: "Cupid Charms", displayEn: "Cupid Charms", items: 3035 },
  { name: "Desk Calendars", displayRu: "Desk Calendars", displayEn: "Desk Calendars", items: 20000 },
  { name: "Diamond Rings", displayRu: "Diamond Rings", displayEn: "Diamond Rings", items: 5788 },
  { name: "Durov's Caps", displayRu: "Durov's Caps", displayEn: "Durov's Caps", items: 3000 },
  { name: "Easter Eggs", displayRu: "Easter Eggs", displayEn: "Easter Eggs", items: 18792 },
  { name: "Electric Skulls", displayRu: "Electric Skulls", displayEn: "Electric Skulls", items: 3000 },
  { name: "Eternal Candles", displayRu: "Eternal Candles", displayEn: "Eternal Candles", items: 9150 },
  { name: "Eternal Roses", displayRu: "Eternal Roses", displayEn: "Eternal Roses", items: 5000 },
  { name: "Evil Eyes", displayRu: "Evil Eyes", displayEn: "Evil Eyes", items: 3000 },
  { name: "Faith Amulets", displayRu: "Faith Amulets", displayEn: "Faith Amulets", items: 2000 },
  { name: "Fresh Socks", displayRu: "Fresh Socks", displayEn: "Fresh Socks", items: 3700 },
  { name: "Flying Brooms", displayRu: "Flying Brooms", displayEn: "Flying Brooms", items: 5000 },
  { name: "Gem Signets", displayRu: "Gem Signets", displayEn: "Gem Signets", items: 1000 },
  { name: "Genie Lamps", displayRu: "Genie Lamps", displayEn: "Genie Lamps", items: 2500 },
  { name: "Ginger Cookies", displayRu: "Ginger Cookies", displayEn: "Ginger Cookies", items: 8000 },
  { name: "Hanging Stars", displayRu: "Hanging Stars", displayEn: "Hanging Stars", items: 4500 },
  { name: "Happy Brownies", displayRu: "Happy Brownies", displayEn: "Happy Brownies", items: 1500 },
  { name: "Heart Lockets", displayRu: "Heart Lockets", displayEn: "Heart Lockets", items: 1000 },
  { name: "Heroic Helmets", displayRu: "Heroic Helmets", displayEn: "Heroic Helmets", items: 500 },
  { name: "Hex Pots", displayRu: "Hex Pots", displayEn: "Hex Pots", items: 15000 },
  { name: "Holiday Drinks", displayRu: "Holiday Drinks", displayEn: "Holiday Drinks", items: 4000 },
  { name: "Hypno Lollipops", displayRu: "Hypno Lollipops", displayEn: "Hypno Lollipops", items: 6000 },
  { name: "Ice Creams", displayRu: "Ice Creams", displayEn: "Ice Creams", items: 8000 },
  { name: "Jacks in the Box", displayRu: "Jacks in the Box", displayEn: "Jacks in the Box", items: 13000 },
  { name: "Jelly Bunnies", displayRu: "Jelly Bunnies", displayEn: "Jelly Bunnies", items: 10500 },
  { name: "Jingle Bells", displayRu: "Jingle Bells", displayEn: "Jingle Bells", items: 5000 },
  { name: "Kissed Frogs", displayRu: "Kissed Frogs", displayEn: "Kissed Frogs", items: 6000 },
  { name: "Light Swords", displayRu: "Light Swords", displayEn: "Light Swords", items: 9000 },
  { name: "Loot Bags", displayRu: "Loot Bags", displayEn: "Loot Bags", items: 5000 },
  { name: "Love Potions", displayRu: "Love Potions", displayEn: "Love Potions", items: 3000 },
  { name: "Lowriders", displayRu: "Lowriders", displayEn: "Lowriders", items: 5000 },
  { name: "Mad Pumpkins", displayRu: "Mad Pumpkins", displayEn: "Mad Pumpkins", items: 3000 },
  { name: "Magic Potions", displayRu: "Magic Potions", displayEn: "Magic Potions", items: 1000 },
  { name: "Plush Pepes", displayRu: "Plush Pepes", displayEn: "Plush Pepes", items: 5000 },
  { name: "Sakura Flowers", displayRu: "Sakura Flowers", displayEn: "Sakura Flowers", items: 8000 },
  { name: "Scared Cats", displayRu: "Scared Cats", displayEn: "Scared Cats", items: 12000 },
  { name: "Skull Flowers", displayRu: "Skull Flowers", displayEn: "Skull Flowers", items: 3000 },
  { name: "Snow Globes", displayRu: "Snow Globes", displayEn: "Snow Globes", items: 3000 },
  { name: "Snow Mittens", displayRu: "Snow Mittens", displayEn: "Snow Mittens", items: 3500 },
  { name: "Snoop Doggs", displayRu: "Snoop Doggs", displayEn: "Snoop Doggs", items: 30000 },
  { name: "Stellar Rockets", displayRu: "Stellar Rockets", displayEn: "Stellar Rockets", items: 9000 },
  { name: "Swiss Watches", displayRu: "Swiss Watches", displayEn: "Swiss Watches", items: 8000 },
  { name: "Toy Bears", displayRu: "Toy Bears", displayEn: "Toy Bears", items: 14000 },
  { name: "Voodoo Dolls", displayRu: "Voodoo Dolls", displayEn: "Voodoo Dolls", items: 7000 },
  { name: "Witch Hats", displayRu: "Witch Hats", displayEn: "Witch Hats", items: 16000 },
]

interface MarketItem {
  name: string
  id: string
  price: string
  color: string
  collection: string
  animationUrl: string
  fallbackImage: string
}

// Removed duplicate getGiftUrls function definition.
// The original getGiftUrls function from lib/utils is likely intended to be used.

const allMarketItems: MarketItem[] = [
  // Ionic Dryers (2)
  {
    name: "Ionic Dryer",
    id: "#7561",
    price: "18.50",
    color: "bg-cyan-600",
    collection: "Ionic Dryers",
    ...(() => {
      const urls = getGiftUrls("Ionic Dryers", "#7561")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Ionic Dryer",
    id: "#3421",
    price: "12.75",
    color: "bg-cyan-600",
    collection: "Ionic Dryers",
    ...(() => {
      const urls = getGiftUrls("Ionic Dryers", "#3421")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Plush Pepes
  {
    name: "Plush Pepe",
    id: "#1609",
    price: "6850.00",
    color: "bg-[#8B7355]",
    collection: "Plush Pepes",
    ...(() => {
      const urls = getGiftUrls("Plush Pepes", "#1609")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Plush Pepe",
    id: "#1666",
    price: "7240.00",
    color: "bg-[#8B7355]",
    collection: "Plush Pepes",
    ...(() => {
      const urls = getGiftUrls("Plush Pepes", "#1666")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Plush Pepe",
    id: "#1909",
    price: "9580.00",
    color: "bg-[#8B7355]",
    collection: "Plush Pepes",
    ...(() => {
      const urls = getGiftUrls("Plush Pepes", "#1909")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Artisan Bricks (3)
  {
    name: "Artisan Brick",
    id: "#534",
    price: "45.00",
    color: "bg-amber-700",
    collection: "Artisan Bricks",
    animationUrl: "https://nft.fragment.com/gift/artisanbrick-534.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/artisanbrick-534.webp",
  },
  {
    name: "Artisan Brick",
    id: "#438",
    price: "42.00",
    color: "bg-amber-700",
    collection: "Artisan Bricks",
    animationUrl: "https://nft.fragment.com/gift/artisanbrick-438.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/artisanbrick-438.webp",
  },
  {
    name: "Artisan Brick",
    id: "#1167",
    price: "48.00",
    color: "bg-amber-700",
    collection: "Artisan Bricks",
    animationUrl: "https://nft.fragment.com/gift/artisanbrick-1167.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/artisanbrick-1167.webp",
  },

  // Astral Shards (1)
  {
    name: "Astral Shard",
    id: "#496",
    price: "65.00",
    color: "bg-purple-600",
    collection: "Astral Shards",
    animationUrl: "https://nft.fragment.com/gift/astralshard-496.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/astralshard-496.webp",
  },

  // Berry Boxes (10)
  {
    name: "Berry Box",
    id: "#4863",
    price: "3.53",
    color: "bg-pink-500",
    collection: "Berry Boxes",
    ...(() => {
      const urls = getGiftUrls("Berry Boxes", "#4863")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Berry Box",
    id: "#1400",
    price: "3.80",
    color: "bg-pink-500",
    collection: "Berry Boxes",
    ...(() => {
      const urls = getGiftUrls("Berry Boxes", "#1400")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Berry Box",
    id: "#6553",
    price: "3.25",
    color: "bg-pink-500",
    collection: "Berry Boxes",
    ...(() => {
      const urls = getGiftUrls("Berry Boxes", "#6553")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Berry Box",
    id: "#3824",
    price: "3.45",
    color: "bg-pink-500",
    collection: "Berry Boxes",
    ...(() => {
      const urls = getGiftUrls("Berry Boxes", "#3824")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Berry Box",
    id: "#2083",
    price: "3.60",
    color: "bg-pink-500",
    collection: "Berry Boxes",
    ...(() => {
      const urls = getGiftUrls("Berry Boxes", "#2083")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Berry Box",
    id: "#2978",
    price: "3.55",
    color: "bg-pink-500",
    collection: "Berry Boxes",
    ...(() => {
      const urls = getGiftUrls("Berry Boxes", "#2978")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Berry Box",
    id: "#3197",
    price: "3.70",
    color: "bg-pink-500",
    collection: "Berry Boxes",
    ...(() => {
      const urls = getGiftUrls("Berry Boxes", "#3197")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Berry Box",
    id: "#6920",
    price: "3.15",
    color: "bg-pink-500",
    collection: "Berry Boxes",
    ...(() => {
      const urls = getGiftUrls("Berry Boxes", "#6920")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Berry Box",
    id: "#5161",
    price: "3.35",
    color: "bg-pink-500",
    collection: "Berry Boxes",
    ...(() => {
      const urls = getGiftUrls("Berry Boxes", "#5161")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Berry Box",
    id: "#4091",
    price: "3.40",
    color: "bg-pink-500",
    collection: "Berry Boxes",
    ...(() => {
      const urls = getGiftUrls("Berry Boxes", "#4091")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // B-Day Candles (1)
  {
    name: "B-Day Candle",
    id: "#2741",
    price: "2.50",
    color: "bg-yellow-400",
    collection: "B-Day Candles",
    animationUrl: "https://nft.fragment.com/gift/bdaycandle-2741.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bdaycandle-2741.webp",
  },

  // Big Years (3)
  {
    name: "Big Year",
    id: "#4472",
    price: "4.20",
    color: "bg-red-500",
    collection: "Big Years",
    animationUrl: "https://nft.fragment.com/gift/bigyear-4472.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bigyear-4472.webp",
  },
  {
    name: "Big Year",
    id: "#6503",
    price: "4.00",
    color: "bg-red-500",
    collection: "Big Years",
    animationUrl: "https://nft.fragment.com/gift/bigyear-6503.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bigyear-6503.webp",
  },
  {
    name: "Big Year",
    id: "#1580",
    price: "4.50",
    color: "bg-red-500",
    collection: "Big Years",
    animationUrl: "https://nft.fragment.com/gift/bigyear-1580.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bigyear-1580.webp",
  },

  // Bling Binkies (15)
  {
    name: "Bling Binky",
    id: "#53",
    price: "120.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#53")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#58",
    price: "118.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#58")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#100",
    price: "115.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#100")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#115",
    price: "112.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#115")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#92",
    price: "116.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#92")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#145",
    price: "108.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#145")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#16",
    price: "125.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#16")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#75",
    price: "119.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#75")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#182",
    price: "105.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#182")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#1",
    price: "150.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#1")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#214",
    price: "102.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#214")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#241",
    price: "100.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#241")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#192",
    price: "104.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#192")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#171",
    price: "106.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#171")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Bling Binky",
    id: "#128",
    price: "110.00",
    color: "bg-pink-300",
    collection: "Bling Binkies",
    ...(() => {
      const urls = getGiftUrls("Bling Binkies", "#128")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Bonded Rings (3)
  {
    name: "Bonded Ring",
    id: "#1790",
    price: "35.00",
    color: "bg-rose-400",
    collection: "Bonded Rings",
    animationUrl: "https://nft.fragment.com/gift/bondedring-1790.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bondedring-1790.webp",
  },
  {
    name: "Bonded Ring",
    id: "#1594",
    price: "34.00",
    color: "bg-rose-400",
    collection: "Bonded Rings",
    animationUrl: "https://nft.fragment.com/gift/bondedring-1594.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bondedring-1594.webp",
  },
  {
    name: "Bonded Ring",
    id: "#928",
    price: "36.50",
    color: "bg-rose-400",
    collection: "Bonded Rings",
    animationUrl: "https://nft.fragment.com/gift/bondedring-928.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bondedring-928.webp",
  },

  // Bow Ties (4)
  {
    name: "Bow Tie",
    id: "#2292",
    price: "8.50",
    color: "bg-indigo-500",
    collection: "Bow Ties",
    animationUrl: "https://nft.fragment.com/gift/bowtie-2292.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bowtie-2292.webp",
  },
  {
    name: "Bow Tie",
    id: "#557",
    price: "9.00",
    color: "bg-indigo-500",
    collection: "Bow Ties",
    animationUrl: "https://nft.fragment.com/gift/bowtie-557.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bowtie-557.webp",
  },
  {
    name: "Bow Tie",
    id: "#2156",
    price: "8.20",
    color: "bg-indigo-500",
    collection: "Bow Ties",
    animationUrl: "https://nft.fragment.com/gift/bowtie-2156.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bowtie-2156.webp",
  },
  {
    name: "Bow Tie",
    id: "#4336",
    price: "7.80",
    color: "bg-indigo-500",
    collection: "Bow Ties",
    animationUrl: "https://nft.fragment.com/gift/bowtie-4336.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bowtie-4336.webp",
  },

  // Bunny Muffins (1)
  {
    name: "Bunny Muffin",
    id: "#4186",
    price: "6.00",
    color: "bg-amber-200",
    collection: "Bunny Muffins",
    animationUrl: "https://nft.fragment.com/gift/bunnymuffin-4186.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/bunnymuffin-4186.webp",
  },

  // Candy Canes (3)
  {
    name: "Candycane",
    id: "#7614",
    price: "1.55",
    color: "bg-red-400",
    collection: "Candy Canes",
    animationUrl: "https://nft.fragment.com/gift/candycane-7614.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/candycane-7614.webp",
  },
  {
    name: "Candycane",
    id: "#1300",
    price: "1.80",
    color: "bg-red-400",
    collection: "Candy Canes",
    animationUrl: "https://nft.fragment.com/gift/candycane-1300.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/candycane-1300.webp",
  },
  {
    name: "Candycane",
    id: "#862",
    price: "1.90",
    color: "bg-red-400",
    collection: "Candy Canes",
    animationUrl: "https://nft.fragment.com/gift/candycane-862.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/candycane-862.webp",
  },

  // Clover Pins (3)
  {
    name: "Clover Pin",
    id: "#4487",
    price: "1.65",
    color: "bg-green-500",
    collection: "Clover Pins",
    animationUrl: "https://nft.fragment.com/gift/cloverpin-4487.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/cloverpin-4487.webp",
  },
  {
    name: "Clover Pin",
    id: "#2353",
    price: "1.75",
    color: "bg-green-500",
    collection: "Clover Pins",
    animationUrl: "https://nft.fragment.com/gift/cloverpin-2353.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/cloverpin-2353.webp",
  },
  {
    name: "Clover Pin",
    id: "#3897",
    price: "1.60",
    color: "bg-green-500",
    collection: "Clover Pins",
    animationUrl: "https://nft.fragment.com/gift/cloverpin-3897.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/cloverpin-3897.webp",
  },

  // Crystal Balls (1)
  {
    name: "Crystal Ball",
    id: "#4486",
    price: "12.00",
    color: "bg-violet-500",
    collection: "Crystal Balls",
    animationUrl: "https://nft.fragment.com/gift/crystalball-4486.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/crystalball-4486.webp",
  },

  // Cupid Charms (2)
  {
    name: "Cupid Charm",
    id: "#2274",
    price: "11.50",
    color: "bg-pink-400",
    collection: "Cupid Charms",
    animationUrl: "https://nft.fragment.com/gift/cupidcharm-2274.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/cupidcharm-2274.webp",
  },
  {
    name: "Cupid Charm",
    id: "#200",
    price: "13.00",
    color: "bg-pink-400",
    collection: "Cupid Charms",
    animationUrl: "https://nft.fragment.com/gift/cupidcharm-200.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/cupidcharm-200.webp",
  },

  // Desk Calendars (2)
  {
    name: "Desk Calendar",
    id: "#2981",
    price: "1.80",
    color: "bg-slate-400",
    collection: "Desk Calendars",
    animationUrl: "https://nft.fragment.com/gift/deskcalendar-2981.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/deskcalendar-2981.webp",
  },
  {
    name: "Desk Calendar",
    id: "#17245",
    price: "1.50",
    color: "bg-slate-400",
    collection: "Desk Calendars",
    animationUrl: "https://nft.fragment.com/gift/deskcalendar-17245.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/deskcalendar-17245.webp",
  },

  // Diamond Rings (2)
  {
    name: "Diamond Ring",
    id: "#520",
    price: "15.90",
    color: "bg-cyan-400",
    collection: "Diamond Rings",
    animationUrl: "https://nft.fragment.com/gift/diamondring-520.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/diamondring-520.webp",
  },
  {
    name: "Diamond Ring",
    id: "#3425",
    price: "14.50",
    color: "bg-cyan-400",
    collection: "Diamond Rings",
    animationUrl: "https://nft.fragment.com/gift/diamondring-3425.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/diamondring-3425.webp",
  },

  // Durov's Caps (3)
  {
    name: "Durov's Cap",
    id: "#2458",
    price: "55.00",
    color: "bg-gray-700",
    collection: "Durov's Caps",
    animationUrl: "https://nft.fragment.com/gift/durovscap-2458.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/durovscap-2458.webp",
  },
  {
    name: "Durov's Cap",
    id: "#1448",
    price: "58.00",
    color: "bg-gray-700",
    collection: "Durov's Caps",
    animationUrl: "https://nft.fragment.com/gift/durovscap-1448.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/durovscap-1448.webp",
  },
  {
    name: "Durov's Cap",
    id: "#2110",
    price: "54.00",
    color: "bg-gray-700",
    collection: "Durov's Caps",
    animationUrl: "https://nft.fragment.com/gift/durovscap-2110.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/durovscap-2110.webp",
  },

  // Easter Eggs (2)
  {
    name: "Easter Egg",
    id: "#18150",
    price: "1.25",
    color: "bg-lime-400",
    collection: "Easter Eggs",
    animationUrl: "https://nft.fragment.com/gift/easteregg-18150.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/easteregg-18150.webp",
  },
  {
    name: "Easter Egg",
    id: "#15102",
    price: "1.35",
    color: "bg-lime-400",
    collection: "Easter Eggs",
    animationUrl: "https://nft.fragment.com/gift/easteregg-15102.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/easteregg-15102.webp",
  },

  // Electric Skulls (3)
  {
    name: "Electric Skull",
    id: "#2047",
    price: "28.00",
    color: "bg-purple-700",
    collection: "Electric Skulls",
    animationUrl: "https://nft.fragment.com/gift/electricskull-2047.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/electricskull-2047.webp",
  },
  {
    name: "Electric Skull",
    id: "#2533",
    price: "26.50",
    color: "bg-purple-700",
    collection: "Electric Skulls",
    animationUrl: "https://nft.fragment.com/gift/electricskull-2533.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/electricskull-2533.webp",
  },
  {
    name: "Electric Skull",
    id: "#1423",
    price: "29.00",
    color: "bg-purple-700",
    collection: "Electric Skulls",
    animationUrl: "https://nft.fragment.com/gift/electricskull-1423.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/electricskull-1423.webp",
  },

  // Eternal Roses (1)
  {
    name: "Eternal Rose",
    id: "#3337",
    price: "18.00",
    color: "bg-rose-600",
    collection: "Eternal Roses",
    animationUrl: "https://nft.fragment.com/gift/eternalrose-3337.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/eternalrose-3337.webp",
  },

  // Evil Eyes (1)
  {
    name: "Evil Eye",
    id: "#2639",
    price: "22.00",
    color: "bg-blue-600",
    collection: "Evil Eyes",
    animationUrl: "https://nft.fragment.com/gift/evileye-2639.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/evileye-2639.webp",
  },

  // Eternal Candles (1)
  {
    name: "Eternal Candle",
    id: "#6268",
    price: "5.50",
    color: "bg-orange-400",
    collection: "Eternal Candles",
    animationUrl: "https://nft.fragment.com/gift/eternalcandle-6268.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/eternalcandle-6268.webp",
  },

  // Faith Amulets (5)
  {
    name: "Faith Amulet",
    id: "#1410",
    price: "40.00",
    color: "bg-yellow-600",
    collection: "Faith Amulets",
    animationUrl: "https://nft.fragment.com/gift/faithamulet-1410.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/faithamulet-1410.webp",
  },
  {
    name: "Faith Amulet",
    id: "#2079",
    price: "38.00",
    color: "bg-yellow-600",
    collection: "Faith Amulets",
    animationUrl: "https://nft.fragment.com/gift/faithamulet-2079.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/faithamulet-2079.webp",
  },
  {
    name: "Faith Amulet",
    id: "#2081",
    price: "38.50",
    color: "bg-yellow-600",
    collection: "Faith Amulets",
    animationUrl: "https://nft.fragment.com/gift/faithamulet-2081.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/faithamulet-2081.webp",
  },
  {
    name: "Faith Amulet",
    id: "#2055",
    price: "39.00",
    color: "bg-yellow-600",
    collection: "Faith Amulets",
    animationUrl: "https://nft.fragment.com/gift/faithamulet-2055.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/faithamulet-2055.webp",
  },
  {
    name: "Faith Amulet",
    id: "#1242",
    price: "41.00",
    color: "bg-yellow-600",
    collection: "Faith Amulets",
    animationUrl: "https://nft.fragment.com/gift/faithamulet-1242.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/faithamulet-1242.webp",
  },

  // Fresh Socks (15)
  {
    name: "Fresh Sock",
    id: "#616",
    price: "4.20",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#616")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#2138",
    price: "4.00",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#2138")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#2981",
    price: "3.90",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#2981")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#1206",
    price: "4.10",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#1206")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#3014",
    price: "3.85",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#3014")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#3428",
    price: "4.40",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#3428")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#2997",
    price: "4.55",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#2997")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#2381",
    price: "4.65",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#2381")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#419",
    price: "5.10",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#419")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#2671",
    price: "4.70",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#2671")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#1261",
    price: "4.85",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#1261")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#58",
    price: "5.20",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#58")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#457",
    price: "5.05",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#457")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#788",
    price: "4.95",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#788")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Fresh Sock",
    id: "#186",
    price: "5.15",
    color: "bg-blue-400",
    collection: "Fresh Socks",
    ...(() => {
      const urls = getGiftUrls("Fresh Socks", "#186")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Flying Brooms (1)
  {
    name: "Flying Broom",
    id: "#4010",
    price: "12.00",
    color: "bg-orange-600",
    collection: "Flying Brooms",
    animationUrl: "https://nft.fragment.com/gift/flyingbroom-4010.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/flyingbroom-4010.webp",
  },

  // Gem Signets (1)
  {
    name: "Gem Signet",
    id: "#576",
    price: "85.00",
    color: "bg-emerald-500",
    collection: "Gem Signets",
    animationUrl: "https://nft.fragment.com/gift/gemsignet-576.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/gemsignet-576.webp",
  },

  // Genie Lamps (3)
  {
    name: "Genie Lamp",
    id: "#204",
    price: "45.00",
    color: "bg-amber-500",
    collection: "Genie Lamps",
    animationUrl: "https://nft.fragment.com/gift/genielamp-204.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/genielamp-204.webp",
  },
  {
    name: "Genie Lamp",
    id: "#2072",
    price: "42.00",
    color: "bg-amber-500",
    collection: "Genie Lamps",
    animationUrl: "https://nft.fragment.com/gift/genielamp-2072.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/genielamp-2072.webp",
  },
  {
    name: "Genie Lamp",
    id: "#1973",
    price: "43.00",
    color: "bg-amber-500",
    collection: "Genie Lamps",
    animationUrl: "https://nft.fragment.com/gift/genielamp-1973.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/genielamp-1973.webp",
  },

  // Ginger Cookies (1)
  {
    name: "Ginger Cookie",
    id: "#6175",
    price: "2.20",
    color: "bg-amber-600",
    collection: "Ginger Cookies",
    animationUrl: "https://nft.fragment.com/gift/gingercookie-6175.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/gingercookie-6175.webp",
  },

  // Hanging Stars (2)
  {
    name: "Hanging Star",
    id: "#915",
    price: "3.50",
    color: "bg-yellow-300",
    collection: "Hanging Stars",
    animationUrl: "https://nft.fragment.com/gift/hangingstar-915.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/hangingstar-915.webp",
  },
  {
    name: "Hanging Star",
    id: "#3907",
    price: "3.20",
    color: "bg-yellow-300",
    collection: "Hanging Stars",
    animationUrl: "https://nft.fragment.com/gift/hangingstar-3907.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/hangingstar-3907.webp",
  },

  // Happy Brownies (2)
  {
    name: "Happy Brownie",
    id: "#1067",
    price: "18.00",
    color: "bg-amber-800",
    collection: "Happy Brownies",
    animationUrl: "https://nft.fragment.com/gift/happybrownie-1067.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/happybrownie-1067.webp",
  },
  {
    name: "Happy Brownie",
    id: "#173",
    price: "20.00",
    color: "bg-amber-800",
    collection: "Happy Brownies",
    animationUrl: "https://nft.fragment.com/gift/happybrownie-173.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/happybrownie-173.webp",
  },

  // Heart Lockets (3)
  {
    name: "Heart Locket",
    id: "#257",
    price: "55.00",
    color: "bg-rose-500",
    collection: "Heart Lockets",
    animationUrl: "https://nft.fragment.com/gift/heartlocket-257.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/heartlocket-257.webp",
  },
  {
    name: "Heart Locket",
    id: "#589",
    price: "52.00",
    color: "bg-rose-500",
    collection: "Heart Lockets",
    animationUrl: "https://nft.fragment.com/gift/heartlocket-589.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/heartlocket-589.webp",
  },
  {
    name: "Heart Locket",
    id: "#251",
    price: "56.00",
    color: "bg-rose-500",
    collection: "Heart Lockets",
    animationUrl: "https://nft.fragment.com/gift/heartlocket-251.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/heartlocket-251.webp",
  },

  // Heroic Helmets (3)
  {
    name: "Heroic Helmet",
    id: "#178",
    price: "95.00",
    color: "bg-zinc-600",
    collection: "Heroic Helmets",
    animationUrl: "https://nft.fragment.com/gift/heroichelmet-178.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/heroichelmet-178.webp",
  },
  {
    name: "Heroic Helmet",
    id: "#394",
    price: "90.00",
    color: "bg-zinc-600",
    collection: "Heroic Helmets",
    animationUrl: "https://nft.fragment.com/gift/heroichelmet-394.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/heroichelmet-394.webp",
  },
  {
    name: "Heroic Helmet",
    id: "#268",
    price: "92.00",
    color: "bg-zinc-600",
    collection: "Heroic Helmets",
    animationUrl: "https://nft.fragment.com/gift/heroichelmet-268.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/heroichelmet-268.webp",
  },

  // Hex Pots (2)
  {
    name: "Hex Pot",
    id: "#10348",
    price: "8.00",
    color: "bg-violet-700",
    collection: "Hex Pots",
    animationUrl: "https://nft.fragment.com/gift/hexpot-10348.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/hexpot-10348.webp",
  },
  {
    name: "Hex Pot",
    id: "#2611",
    price: "8.50",
    color: "bg-violet-700",
    collection: "Hex Pots",
    animationUrl: "https://nft.fragment.com/gift/hexpot-2611.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/hexpot-2611.webp",
  },

  // Holiday Drinks (2)
  {
    name: "Holiday Drink",
    id: "#1543",
    price: "4.50",
    color: "bg-red-600",
    collection: "Holiday Drinks",
    animationUrl: "https://nft.fragment.com/gift/holidaydrink-1543.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/holidaydrink-1543.webp",
  },
  {
    name: "Holiday Drink",
    id: "#3064",
    price: "4.20",
    color: "bg-red-600",
    collection: "Holiday Drinks",
    animationUrl: "https://nft.fragment.com/gift/holidaydrink-3064.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/holidaydrink-3064.webp",
  },

  // Hypno Lollipops (2)
  {
    name: "Hypno Lollipop",
    id: "#4601",
    price: "6.50",
    color: "bg-fuchsia-500",
    collection: "Hypno Lollipops",
    animationUrl: "https://nft.fragment.com/gift/hypnolollipop-4601.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/hypnolollipop-4601.webp",
  },
  {
    name: "Hypno Lollipop",
    id: "#5586",
    price: "6.20",
    color: "bg-fuchsia-500",
    collection: "Hypno Lollipops",
    animationUrl: "https://nft.fragment.com/gift/hypnolollipop-5586.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/hypnolollipop-5586.webp",
  },

  // Ice Creams (4)
  {
    name: "Ice Cream",
    id: "#878",
    price: "3.80",
    color: "bg-pink-200",
    collection: "Ice Creams",
    animationUrl: "https://nft.fragment.com/gift/icecream-878.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/icecream-878.webp",
  },
  {
    name: "Ice Cream",
    id: "#7869",
    price: "3.20",
    color: "bg-pink-200",
    collection: "Ice Creams",
    animationUrl: "https://nft.fragment.com/gift/icecream-7869.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/icecream-7869.webp",
  },
  {
    name: "Ice Cream",
    id: "#1244",
    price: "3.60",
    color: "bg-pink-200",
    collection: "Ice Creams",
    animationUrl: "https://nft.fragment.com/gift/icecream-1244.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/icecream-1244.webp",
  },
  {
    name: "Ice Cream",
    id: "#2048",
    price: "3.50",
    color: "bg-pink-200",
    collection: "Ice Creams",
    animationUrl: "https://nft.fragment.com/gift/icecream-2048.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/icecream-2048.webp",
  },

  // Jacks in the Box (15)
  {
    name: "Jack in the Box",
    id: "#11440",
    price: "2.80",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#11440")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#1376",
    price: "3.20",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#1376")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#2109",
    price: "3.00",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#2109")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#9503",
    price: "2.90",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#9503")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#4221",
    price: "2.88",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#4221")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#9932",
    price: "2.55",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#9932")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#4497",
    price: "2.90",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#4497")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#8181",
    price: "2.70",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#8181")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#635",
    price: "3.30",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#635")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#12302",
    price: "2.50",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#12302")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#2597",
    price: "3.05",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#2597")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#117",
    price: "3.50",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#117")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#2157",
    price: "3.08",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#2157")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#9335",
    price: "2.62",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#9335")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jack in the Box",
    id: "#7979",
    price: "2.75",
    color: "bg-red-500",
    collection: "Jacks in the Box",
    ...(() => {
      const urls = getGiftUrls("Jacks in the Box", "#7979")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Jelly Bunnies (15)
  {
    name: "Jelly Bunny",
    id: "#6624",
    price: "4.20",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#6624")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#1621",
    price: "4.80",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#1621")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#7980",
    price: "4.00",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#7980")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#673",
    price: "5.20",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#673")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#42",
    price: "6.00",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#42")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#9564",
    price: "3.80",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#9564")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#1394",
    price: "4.85",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#1394")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#9963",
    price: "3.75",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#9963")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#312",
    price: "5.20",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#312")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#3180",
    price: "4.40",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#3180")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#1935",
    price: "4.70",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#1935")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#42",
    price: "5.50",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#42")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#3965",
    price: "4.30",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#3965")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#4801",
    price: "4.15",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#4801")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#3814",
    price: "4.35",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#3814")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jelly Bunny",
    id: "#8650",
    price: "3.90",
    color: "bg-pink-400",
    collection: "Jelly Bunnies",
    ...(() => {
      const urls = getGiftUrls("Jelly Bunnies", "#8650")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Jingle Bells (15)
  {
    name: "Jingle Bell",
    id: "#2644",
    price: "3.00",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#2644")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#4309",
    price: "2.80",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#4309")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#1634",
    price: "3.10",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#1634")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#102",
    price: "3.50",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#102")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#530",
    price: "3.20",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#530")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#2685",
    price: "2.78",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#2685")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#4983",
    price: "2.40",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#4983")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#1713",
    price: "2.88",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#1713")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#2148",
    price: "2.82",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#2148")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#102",
    price: "3.20",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#102")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#4714",
    price: "2.45",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#4714")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#3792",
    price: "2.55",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#3792")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#3153",
    price: "2.60",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#3153")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#2555",
    price: "2.75",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#2555")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#1451",
    price: "2.92",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#1451")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Jingle Bell",
    id: "#530",
    price: "3.10",
    color: "bg-yellow-500",
    collection: "Jingle Bells",
    ...(() => {
      const urls = getGiftUrls("Jingle Bells", "#530")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Kissed Frogs (3)
  {
    name: "Kissed Frog",
    id: "#1142",
    price: "8.50",
    color: "bg-green-400",
    collection: "Kissed Frogs",
    ...(() => {
      const urls = getGiftUrls("Kissed Frogs", "#1142")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Kissed Frog",
    id: "#5790",
    price: "7.80",
    color: "bg-green-400",
    collection: "Kissed Frogs",
    ...(() => {
      const urls = getGiftUrls("Kissed Frogs", "#5790")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Kissed Frog",
    id: "#752",
    price: "8.80",
    color: "bg-green-400",
    collection: "Kissed Frogs",
    ...(() => {
      const urls = getGiftUrls("Kissed Frogs", "#752")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Light Swords (2)
  {
    name: "Light Sword",
    id: "#2567",
    price: "18.00",
    color: "bg-blue-500",
    collection: "Light Swords",
    ...(() => {
      const urls = getGiftUrls("Light Swords", "#2567")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Light Sword",
    id: "#8167",
    price: "16.50",
    color: "bg-blue-500",
    collection: "Light Swords",
    ...(() => {
      const urls = getGiftUrls("Light Swords", "#8167")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Loot Bags (2)
  {
    name: "Loot Bag",
    id: "#733",
    price: "12.00",
    color: "bg-amber-500",
    collection: "Loot Bags",
    ...(() => {
      const urls = getGiftUrls("Loot Bags", "#733")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Loot Bag",
    id: "#4324",
    price: "10.50",
    color: "bg-amber-500",
    collection: "Loot Bags",
    ...(() => {
      const urls = getGiftUrls("Loot Bags", "#4324")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Love Potions (2)
  {
    name: "Love Potion",
    id: "#2241",
    price: "15.00",
    color: "bg-pink-500",
    collection: "Love Potions",
    animationUrl: "https://nft.fragment.com/gift/lovepotion-2241.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/lovepotion-2241.webp",
  },
  {
    name: "Love Potion",
    id: "#1453",
    price: "16.00",
    color: "bg-pink-500",
    collection: "Love Potions",
    animationUrl: "https://nft.fragment.com/gift/lovepotion-1453.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/lovepotion-1453.webp",
  },

  // Lowriders (4)
  {
    name: "Lowrider",
    id: "#552",
    price: "35.00",
    color: "bg-purple-500",
    collection: "Lowriders",
    ...(() => {
      const urls = getGiftUrls("Lowriders", "#552")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Lowrider",
    id: "#4286",
    price: "32.00",
    color: "bg-purple-500",
    collection: "Lowriders",
    ...(() => {
      const urls = getGiftUrls("Lowriders", "#4286")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Lowrider",
    id: "#1999",
    price: "34.00",
    color: "bg-purple-500",
    collection: "Lowriders",
    ...(() => {
      const urls = getGiftUrls("Lowriders", "#1999")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Lowrider",
    id: "#3328",
    price: "33.00",
    color: "bg-purple-500",
    collection: "Lowriders",
    ...(() => {
      const urls = getGiftUrls("Lowriders", "#3328")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Mad Pumpkins (3)
  {
    name: "Mad Pumpkin",
    id: "#2807",
    price: "14.00",
    color: "bg-orange-500",
    collection: "Mad Pumpkins",
    ...(() => {
      const urls = getGiftUrls("Mad Pumpkins", "#2807")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Mad Pumpkin",
    id: "#2198",
    price: "14.50",
    color: "bg-orange-500",
    collection: "Mad Pumpkins",
    ...(() => {
      const urls = getGiftUrls("Mad Pumpkins", "#2198")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Mad Pumpkin",
    id: "#104",
    price: "16.00",
    color: "bg-orange-500",
    collection: "Mad Pumpkins",
    ...(() => {
      const urls = getGiftUrls("Mad Pumpkins", "#104")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Magic Potions (2)
  {
    name: "Magic Potion",
    id: "#823",
    price: "45.00",
    color: "bg-purple-600",
    collection: "Magic Potions",
    animationUrl: "https://nft.fragment.com/gift/magicpotion-823.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/magicpotion-823.webp",
  },
  {
    name: "Magic Potion",
    id: "#866",
    price: "44.00",
    color: "bg-purple-600",
    collection: "Magic Potions",
    animationUrl: "https://nft.fragment.com/gift/magicpotion-866.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/magicpotion-866.webp",
  },

  // Sakura Flowers (4)
  {
    name: "Sakura Flower",
    id: "#7347",
    price: "5.50",
    color: "bg-pink-300",
    collection: "Sakura Flowers",
    ...(() => {
      const urls = getGiftUrls("Sakura Flowers", "#7347")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Sakura Flower",
    id: "#6248",
    price: "5.80",
    color: "bg-pink-300",
    collection: "Sakura Flowers",
    ...(() => {
      const urls = getGiftUrls("Sakura Flowers", "#6248")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Sakura Flower",
    id: "#7158",
    price: "5.55",
    color: "bg-pink-300",
    collection: "Sakura Flowers",
    ...(() => {
      const urls = getGiftUrls("Sakura Flowers", "#7158")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Sakura Flower",
    id: "#397",
    price: "6.20",
    color: "bg-pink-300",
    collection: "Sakura Flowers",
    ...(() => {
      const urls = getGiftUrls("Sakura Flowers", "#397")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Scared Cats (2)
  {
    name: "Scared Cat",
    id: "#11207",
    price: "3.20",
    color: "bg-orange-400",
    collection: "Scared Cats",
    ...(() => {
      const urls = getGiftUrls("Scared Cats", "#11207")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Scared Cat",
    id: "#10746",
    price: "3.40",
    color: "bg-orange-400",
    collection: "Scared Cats",
    ...(() => {
      const urls = getGiftUrls("Scared Cats", "#10746")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Skull Flowers (2)
  {
    name: "Skull Flower",
    id: "#1093",
    price: "18.00",
    color: "bg-purple-800",
    collection: "Skull Flowers",
    animationUrl: "https://nft.fragment.com/gift/skullflower-1093.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/skullflower-1093.webp",
  },
  {
    name: "Skull Flower",
    id: "#2506",
    price: "17.00",
    color: "bg-purple-800",
    collection: "Skull Flowers",
    animationUrl: "https://nft.fragment.com/gift/skullflower-2506.lottie.json",
    fallbackImage: "https://nft.fragment.com/gift/skullflower-2506.webp",
  },

  // Snow Globes (2)
  {
    name: "Snow Globe",
    id: "#1522",
    price: "15.00",
    color: "bg-cyan-300",
    collection: "Snow Globes",
    ...(() => {
      const urls = getGiftUrls("Snow Globes", "#1522")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Globe",
    id: "#2680",
    price: "14.50",
    color: "bg-cyan-300",
    collection: "Snow Globes",
    ...(() => {
      const urls = getGiftUrls("Snow Globes", "#2680")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Snow Mittens (15)
  {
    name: "Snow Mittens",
    id: "#2354",
    price: "2.50",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#2354")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#1416",
    price: "2.70",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#1416")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#1158",
    price: "2.80",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#1158")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#255",
    price: "3.00",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#255")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#509",
    price: "2.90",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#509")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#3045",
    price: "3.10",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#3045")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#2554",
    price: "3.18",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#2554")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#2190",
    price: "3.25",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#2190")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#2150",
    price: "3.26",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#2150")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#1174",
    price: "3.48",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#1174")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#1596",
    price: "3.35",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#1596")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#1112",
    price: "3.52",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#1112")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#1850",
    price: "3.30",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#1850")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#2954",
    price: "3.12",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#2954")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snow Mittens",
    id: "#1420",
    price: "3.38",
    color: "bg-cyan-400",
    collection: "Snow Mittens",
    ...(() => {
      const urls = getGiftUrls("Snow Mittens", "#1420")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Snoop Doggs (3)
  {
    name: "Snoop Dogg",
    id: "#28045",
    price: "2.00",
    color: "bg-yellow-600",
    collection: "Snoop Doggs",
    ...(() => {
      const urls = getGiftUrls("Snoop Doggs", "#28045")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snoop Dogg",
    id: "#25932",
    price: "2.10",
    color: "bg-yellow-600",
    collection: "Snoop Doggs",
    ...(() => {
      const urls = getGiftUrls("Snoop Doggs", "#25932")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Snoop Dogg",
    id: "#25459",
    price: "2.15",
    color: "bg-yellow-600",
    collection: "Snoop Doggs",
    ...(() => {
      const urls = getGiftUrls("Snoop Doggs", "#25459")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Stellar Rockets (3)
  {
    name: "Stellar Rocket",
    id: "#2694",
    price: "7.00",
    color: "bg-indigo-500",
    collection: "Stellar Rockets",
    ...(() => {
      const urls = getGiftUrls("Stellar Rockets", "#2694")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Stellar Rocket",
    id: "#8061",
    price: "6.50",
    color: "bg-indigo-500",
    collection: "Stellar Rockets",
    ...(() => {
      const urls = getGiftUrls("Stellar Rockets", "#8061")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Stellar Rocket",
    id: "#7515",
    price: "6.80",
    color: "bg-indigo-500",
    collection: "Stellar Rockets",
    ...(() => {
      const urls = getGiftUrls("Stellar Rockets", "#7515")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Swiss Watches (15)
  {
    name: "Swiss Watch",
    id: "#5897",
    price: "8.50",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#5897")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#1191",
    price: "9.00",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#1191")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#5471",
    price: "8.20",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#5471")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#2557",
    price: "8.80",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#2557")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#256",
    price: "10.00",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#256")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#7707",
    price: "27.00",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#7707")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#1343",
    price: "31.50",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#1343")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#4528",
    price: "29.00",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#4528")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#2194",
    price: "30.50",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#2194")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#6840",
    price: "27.50",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#6840")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#6014",
    price: "28.20",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#6014")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#2285",
    price: "30.20",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#2285")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#3378",
    price: "29.50",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#3378")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#1659",
    price: "31.00",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#1659")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Swiss Watch",
    id: "#5680",
    price: "28.30",
    color: "bg-amber-600",
    collection: "Swiss Watches",
    ...(() => {
      const urls = getGiftUrls("Swiss Watches", "#5680")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Toy Bears (3)
  {
    name: "Toy Bear",
    id: "#6895",
    price: "4.50",
    color: "bg-amber-300",
    collection: "Toy Bears",
    ...(() => {
      const urls = getGiftUrls("Toy Bears", "#6895")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Toy Bear",
    id: "#12417",
    price: "4.20",
    color: "bg-amber-300",
    collection: "Toy Bears",
    ...(() => {
      const urls = getGiftUrls("Toy Bears", "#12417")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Toy Bear",
    id: "#6898",
    price: "4.55",
    color: "bg-amber-300",
    collection: "Toy Bears",
    ...(() => {
      const urls = getGiftUrls("Toy Bears", "#6898")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Voodoo Dolls (2)
  {
    name: "Voodoo Doll",
    id: "#497",
    price: "9.00",
    color: "bg-purple-400",
    collection: "Voodoo Dolls",
    ...(() => {
      const urls = getGiftUrls("Voodoo Dolls", "#497")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Voodoo Doll",
    id: "#6742",
    price: "8.50",
    color: "bg-purple-400",
    collection: "Voodoo Dolls",
    ...(() => {
      const urls = getGiftUrls("Voodoo Dolls", "#6742")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },

  // Witch Hats (1)
  {
    name: "Witch Hat",
    id: "#15381",
    price: "2.20",
    color: "bg-purple-600",
    collection: "Witch Hats",
    ...(() => {
      const urls = getGiftUrls("Witch Hats", "#15381")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
  {
    name: "Witch Hat",
    id: "#3219",
    price: "2.80",
    color: "bg-purple-600",
    collection: "Witch Hats",
    ...(() => {
      const urls = getGiftUrls("Witch Hats", "#3219")
      return { animationUrl: urls.lottie, fallbackImage: urls.webp }
    })(),
  },
]

interface MarketItem {
  name: string
  id: string
  price: string
  color: string
  collection: string
  animationUrl: string
  fallbackImage: string
}

const priceRanges = [
  { label: { ru: "Все цены", en: "All prices" }, min: 0, max: Number.POSITIVE_INFINITY },
  { label: { ru: "До 5 TON", en: "Under 5 TON" }, min: 0, max: 5 },
  { label: { ru: "5-20 TON", en: "5-20 TON" }, min: 5, max: 20 },
  { label: { ru: "20-50 TON", en: "20-50 TON" }, min: 20, max: 50 },
  { label: { ru: "50-100 TON", en: "50-100 TON" }, min: 50, max: 100 },
  { label: { ru: "100+ TON", en: "100+ TON" }, min: 100, max: Number.POSITIVE_INFINITY },
]

const MarketItemCard = memo(function MarketItemCard({
  item,
  onPriceClick,
}: {
  item: MarketItem
  onPriceClick: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05, y: -6 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl overflow-hidden bg-card border-2 border-border group hover:border-blue-500/70 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer"
    >
      <div className={`aspect-square ${item.color} relative overflow-hidden`}>
        <LottieGift animationUrl={item.animationUrl} fallbackImage={item.fallbackImage} fullscreen />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-foreground text-sm group-hover:text-blue-500 transition-colors duration-200">
          {item.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">{item.id}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPriceClick}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full py-2.5 px-4 text-center text-sm font-bold flex items-center justify-center gap-1.5 group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
        >
          {item.price} <TonIcon className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </motion.div>
  )
})

function FilterButton({
  active,
  onClick,
  children,
  variant = "default",
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  variant?: "default" | "primary" | "success" | "danger"
}) {
  const baseStyles =
    "relative overflow-hidden px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95"

  const variants = {
    default: active
      ? "bg-blue-500 text-white shadow-md shadow-blue-500/25"
      : "bg-card border border-border text-muted-foreground hover:border-blue-500/50 hover:text-foreground hover:bg-blue-500/5",
    primary: active
      ? "bg-blue-500 text-white shadow-md shadow-blue-500/25"
      : "bg-card border border-border text-muted-foreground hover:border-blue-500/50 hover:text-foreground hover:bg-blue-500/5",
    success: active
      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
      : "bg-card border border-border text-muted-foreground hover:border-emerald-500/50 hover:text-foreground hover:bg-emerald-500/5",
    danger: active
      ? "bg-red-500 text-white shadow-md shadow-red-500/25"
      : "bg-card border border-border text-muted-foreground hover:border-red-500/50 hover:text-foreground hover:bg-red-500/5",
  }

  return (
    <button onClick={onClick} className={`${baseStyles} ${variants[variant]}`}>
      {active && <span className="absolute inset-0 bg-white/20 animate-pulse" />}
      <span className="relative flex items-center gap-1">{children}</span>
    </button>
  )
}

export function MarketPage() {
  const { language, isAuthenticated, openAuthModal, telegramUser } = useAuth()
  const t = translations[language]

  const [selectedCollection, setSelectedCollection] = useState("all")
  const [isCollectionOpen, setIsCollectionOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(12)
  const [sortType, setSortType] = useState<SortType>(SortType.none) // Use the enum here
  const [priceRange, setPriceRange] = useState(0)
  const [isPriceRangeOpen, setIsPriceRangeOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  const collectionRef = useRef<HTMLDivElement>(null)
  const priceRangeRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (collectionRef.current && !collectionRef.current.contains(event.target as Node)) {
        setIsCollectionOpen(false)
      }
      if (priceRangeRef.current && !priceRangeRef.current.contains(event.target as Node)) {
        setIsPriceRangeOpen(false)
      }
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setIsFiltersOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const [userGiftIds, setUserGiftIds] = useState<Set<string>>(new Set())
  // Mock userGifts and sortBy, searchTerm for the sake of the example as they are not present in the original code.
  // In a real application, these would be fetched or derived from props/context.
  const userGifts = [] as any[] // Replace with actual user gift data
  // const sortBy = SortType.none // Replace with actual sort order
  // const searchTerm = searchQuery // Use the existing searchQuery state for searchTerm

  // Removed the first filteredItems useMemo as it's redundant and replaced by the second one.
  // const filteredItems = useMemo(() => {
  //   const userGiftIds = new Set(userGifts.map((g) => g.nftId))

  //   return allMarketItems
  //     .filter((item) => {
  //       // Hide gifts user already owns
  //       if (userGiftIds.has(item.id)) return false

  //       // Use 'all' for the 'All' collection name and compare lowercased
  //       if (selectedCollection !== "all") {
  //         return item.collection.toLowerCase() === selectedCollection.toLowerCase()
  //       }
  //       return true
  //     })
  //     .filter((item) => {
  //       if (searchTerm) {
  //         const search = searchTerm.toLowerCase()
  //         return (
  //           item.name.toLowerCase().includes(search) ||
  //           item.id.toLowerCase().includes(search) ||
  //           item.collection.toLowerCase().includes(search) // Assuming collection name is needed for search
  //         )
  //       }
  //       return true
  //     })
  //     .sort((a, b) => {
  //       // The original code already had sorting logic, this part is to integrate the new sorting options if needed
  //       // For this merge, we'll keep the original sorting logic and ensure it's applied correctly
  //       if (sortType === SortType["price-asc"]) {
  //         return Number.parseFloat(a.price) - Number.parseFloat(b.price)
  //       } else if (sortType === SortType["price-desc"]) {
  //         return Number.parseFloat(b.price) - Number.parseFloat(a.price)
  //       } else if (sortType === SortType["id-asc"]) {
  //         const idA = Number.parseInt(a.id.replace("#", ""))
  //         const idB = Number.parseInt(b.id.replace("#", ""))
  //         return idA - idB
  //       } else if (sortType === SortType["id-desc"]) {
  //         const idA = Number.parseInt(a.id.replace("#", ""))
  //         const idB = Number.parseInt(b.id.replace("#", ""))
  //         return idB - idA
  //       }
  //       // Default sort if none is selected
  //       return 0
  //     })
  // }, [allMarketItems, userGifts, selectedCollection, searchTerm, sortType]) // Added sortType to dependencies

  useEffect(() => {
    const fetchUserGifts = async () => {
      if (!telegramUser?.id) return

      try {
        const res = await fetch(`/api/user/gifts?telegramId=${telegramUser.id}`)
        const data = await res.json()

        if (data.success && data.gifts) {
          const giftIds = new Set(data.gifts.map((gift: any) => gift.nftId))
          setUserGiftIds(giftIds)
        }
      } catch (error) {
        console.error("Error fetching user gifts:", error)
      }
    }

    fetchUserGifts()
  }, [telegramUser?.id])

  const filteredAndSortedItems = useMemo(() => {
    let items =
      selectedCollection === "all"
        ? allMarketItems
        : allMarketItems.filter((item) => item.collection === selectedCollection)

    const userGiftIds = new Set(userGifts.map((g) => g.nftId))
    items = items.filter((item) => !userGiftIds.has(item.id))

    const range = priceRanges[priceRange]
    if (range.min > 0 || range.max < Number.POSITIVE_INFINITY) {
      items = items.filter((item) => {
        const price = Number.parseFloat(item.price)
        return price >= range.min && price <= range.max
      })
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query) ||
          item.collection.toLowerCase().includes(query),
      )
    }

    if (sortType === SortType["price-asc"]) {
      // Use the enum here
      items = [...items].sort((a, b) => Number.parseFloat(a.price) - Number.parseFloat(b.price))
    } else if (sortType === SortType["price-desc"]) {
      // Use the enum here
      items = [...items].sort((a, b) => Number.parseFloat(b.price) - Number.parseFloat(a.price))
    } else if (sortType === SortType["id-asc"]) {
      // Use the enum here
      items = [...items].sort((a, b) => {
        const idA = Number.parseInt(a.id.replace("#", ""))
        const idB = Number.parseInt(b.id.replace("#", ""))
        return idA - idB
      })
    } else if (sortType === SortType["id-desc"]) {
      // Use the enum here
      items = [...items].sort((a, b) => {
        const idA = Number.parseInt(a.id.replace("#", ""))
        const idB = Number.parseInt(b.id.replace("#", ""))
        return idB - idA
      })
    }

    return items
  }, [selectedCollection, sortType, priceRange, searchQuery, userGifts]) // Added userGifts to dependencies

  const visibleItems = useMemo(() => {
    return filteredAndSortedItems.slice(0, visibleCount)
  }, [filteredAndSortedItems, visibleCount])

  useEffect(() => {
    setVisibleCount(12)
  }, [selectedCollection, priceRange, searchQuery])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredAndSortedItems.length) {
          setVisibleCount((prev) => Math.min(prev + 6, filteredAndSortedItems.length))
        }
      },
      { threshold: 0.1 },
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => observer.disconnect()
  }, [visibleCount, filteredAndSortedItems.length])

  const selectedCollectionData = collections.find((c) => c.name === selectedCollection)

  const resetFilters = () => {
    setSelectedCollection("all")
    setPriceRange(0)
    setSearchQuery("")
    setSortType(SortType.none) // Reset to none
  }

  const hasActiveFilters =
    selectedCollection !== "all" || priceRange !== 0 || searchQuery.trim() !== "" || sortType !== SortType.none // Check against none

  const activeFiltersCount = [selectedCollection !== "all", priceRange !== 0, sortType !== SortType.none].filter(
    // Check against none
    Boolean,
  ).length

  const handlePriceClick = useCallback(() => {
    if (!isAuthenticated) {
      openAuthModal()
    }
  }, [isAuthenticated, openAuthModal])

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4">
        <div className="mb-4 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === "ru" ? "Поиск по названию или номеру..." : "Search by name or ID..."}
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* All gifts button */}
          <button
            onClick={() => setSelectedCollection("all")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
              selectedCollection === "all"
                ? "bg-blue-500 text-white shadow-md shadow-blue-500/25"
                : "bg-card border border-border text-muted-foreground hover:border-blue-500/50 hover:bg-blue-500/5"
            }`}
          >
            <Gift className="w-4 h-4" />
            {language === "ru" ? "Все" : "All"}
          </button>

          <div className="relative" ref={collectionRef}>
            <button
              onClick={() => {
                setIsCollectionOpen(!isCollectionOpen)
                setIsPriceRangeOpen(false)
                setIsFiltersOpen(false)
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
                selectedCollection !== "all"
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/25"
                  : "bg-card border border-border text-muted-foreground hover:border-blue-500/50 hover:bg-blue-500/5"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {selectedCollection !== "all"
                ? selectedCollectionData?.displayEn
                : language === "ru"
                  ? "Коллекция"
                  : "Collection"}
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${isCollectionOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isCollectionOpen && (
              <div className="absolute top-full mt-2 left-0 bg-card border border-border rounded-xl shadow-xl shadow-black/10 z-50 max-h-[300px] overflow-y-auto min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-200">
                {collections.slice(1).map((collection) => (
                  <button
                    key={collection.name}
                    onClick={() => {
                      setSelectedCollection(collection.name)
                      setIsCollectionOpen(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-500/10 transition-colors flex items-center justify-between group"
                  >
                    <span className="group-hover:text-blue-500 transition-colors">
                      {language === "ru" ? collection.displayRu : collection.displayEn}
                    </span>
                    {selectedCollection === collection.name && <Check className="w-4 h-4 text-blue-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={filtersRef}>
            <button
              onClick={() => {
                setIsFiltersOpen(!isFiltersOpen)
                setIsCollectionOpen(false)
                setIsPriceRangeOpen(false)
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
                activeFiltersCount > 0
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                  : "bg-card border border-border text-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/5"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {language === "ru" ? "Фильтры" : "Filters"}
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${isFiltersOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isFiltersOpen && (
              <div className="absolute top-full mt-2 left-0 bg-card border border-border rounded-xl shadow-xl shadow-black/10 z-50 min-w-[280px] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Price Range */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    {language === "ru" ? "Диапазон цен" : "Price Range"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {priceRanges.map((range, index) => (
                      <button
                        key={index}
                        onClick={() => setPriceRange(index)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 ${
                          priceRange === index
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-muted/50 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
                        }`}
                      >
                        {range.label[language === "ru" ? "ru" : "en"]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sorting */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    {language === "ru" ? "Сортировка" : "Sorting"}
                  </p>

                  {/* Price sorting */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground min-w-[50px]">
                      {language === "ru" ? "Цена:" : "Price:"}
                    </span>
                    <div className="flex gap-1">
                      <FilterButton
                        active={sortType === SortType["price-asc"]} // Use the enum here
                        onClick={() =>
                          setSortType(sortType === SortType["price-asc"] ? SortType.none : SortType["price-asc"])
                        } // Use the enum here
                      >
                        {language === "ru" ? "Дешевле" : "Low"}
                      </FilterButton>
                      <FilterButton
                        active={sortType === SortType["price-desc"]} // Use the enum here
                        onClick={() =>
                          setSortType(sortType === SortType["price-desc"] ? SortType.none : SortType["price-desc"])
                        } // Use the enum here
                      >
                        {language === "ru" ? "Дороже" : "High"}
                      </FilterButton>
                    </div>
                  </div>

                  {/* ID sorting */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground min-w-[50px]">
                      {language === "ru" ? "Номер:" : "ID:"}
                    </span>
                    <div className="flex gap-1">
                      <FilterButton
                        active={sortType === SortType["id-asc"]} // Use the enum here
                        onClick={() =>
                          setSortType(sortType === SortType["id-asc"] ? SortType.none : SortType["id-asc"])
                        } // Use the enum here
                      >
                        {language === "ru" ? "Меньше" : "Low"}
                      </FilterButton>
                      <FilterButton
                        active={sortType === SortType["id-desc"]} // Use the enum here
                        onClick={() =>
                          setSortType(sortType === SortType["id-desc"] ? SortType.none : SortType["id-desc"])
                        } // Use the enum here
                      >
                        {language === "ru" ? "Больше" : "High"}
                      </FilterButton>
                    </div>
                  </div>
                </div>

                {/* Reset button */}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      resetFilters()
                      setIsFiltersOpen(false)
                    }}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all duration-200 active:scale-95"
                  >
                    <X className="w-4 h-4" />
                    {language === "ru" ? "Сбросить все" : "Reset all"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick reset button when filters active */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all duration-200 active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mb-4 p-4 bg-gradient-to-r from-card to-card/80 rounded-xl border border-border backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-muted-foreground">
              {selectedCollection === "all"
                ? language === "ru"
                  ? "Все коллекции"
                  : "All collections"
                : selectedCollectionData?.displayEn}
            </p>
            <span className="text-sm font-medium text-foreground bg-muted px-2 py-0.5 rounded-full">
              {filteredAndSortedItems.length} {language === "ru" ? "шт" : "items"}
            </span>
          </div>
        </div>

        {filteredAndSortedItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Gift className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-center mb-4">
              {language === "ru" ? "Ничего не найдено" : "No items found"}
            </p>
            <button
              onClick={resetFilters}
              className="px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-500/25 transition-all duration-200 active:scale-95"
            >
              {language === "ru" ? "Сбросить фильтры" : "Reset filters"}
            </button>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
            >
              {visibleItems.map((item, index) => (
                <motion.div
                  key={`${item.id}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <MarketItemCard item={item} onPriceClick={handlePriceClick} />
                </motion.div>
              ))}
            </motion.div>

            {visibleCount < filteredAndSortedItems.length && (
              <div ref={loaderRef} className="flex justify-center py-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: "linear" }}
                  className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
