// NFT Collection data for displaying gifts

export interface NFTGift {
  id: string
  nftId: string
  collectionName: string
  collectionSlug: string
  giftName: string
  rarity: string
  imageUrl: string
  animationUrl?: string
  lottieUrl?: string
  totalSupply?: number
  number?: number
  attributes?: {
    trait_type: string
    value: string
  }[]
  description?: string
}

// Known NFT collections from Telegram
export const NFT_COLLECTIONS: Record<string, NFTGift> = {
  "IonicDryer-7561": {
    id: "ionic-dryer-7561",
    nftId: "IonicDryer-7561",
    collectionName: "Ionic Dryer",
    collectionSlug: "IonicDryer",
    giftName: "Ionic Dryer #7561",
    rarity: "rare",
    imageUrl: "https://nft.fragment.com/gift/ionicdryer-7561.webp",
    animationUrl: "https://nft.fragment.com/gift/ionicdryer-7561.tgs",
    lottieUrl: "https://nft.fragment.com/gift/ionicdryer-7561.lottie.json",
    number: 7561,
    description: "An exclusive Ionic Dryer with advanced hair care technology.",
    attributes: [
      { trait_type: "Model", value: "Professional" },
      { trait_type: "Power", value: "2000W" },
      { trait_type: "Technology", value: "Ionic" },
    ],
  },
  "IonicDryer-3421": {
    id: "ionic-dryer-3421",
    nftId: "IonicDryer-3421",
    collectionName: "Ionic Dryer",
    collectionSlug: "IonicDryer",
    giftName: "Ionic Dryer #3421",
    rarity: "uncommon",
    imageUrl: "https://nft.fragment.com/gift/ionicdryer-3421.webp",
    animationUrl: "https://nft.fragment.com/gift/ionicdryer-3421.tgs",
    lottieUrl: "https://nft.fragment.com/gift/ionicdryer-3421.lottie.json",
    number: 3421,
    description: "A stylish Ionic Dryer with modern design and reliable performance.",
    attributes: [
      { trait_type: "Model", value: "Standard" },
      { trait_type: "Power", value: "1800W" },
      { trait_type: "Technology", value: "Ionic" },
    ],
  },
  PlushPepe: {
    id: "plush-pepe",
    nftId: "PlushPepe",
    collectionName: "Plush Pepe",
    collectionSlug: "PlushPepe",
    giftName: "Plush Pepe",
    rarity: "rare",
    imageUrl: "https://nft.fragment.com/gift/PlushPepe/preview.webp",
  },
  DiamondRing: {
    id: "diamond-ring",
    nftId: "DiamondRing",
    collectionName: "Diamond Ring",
    collectionSlug: "DiamondRing",
    giftName: "Diamond Ring",
    rarity: "legendary",
    imageUrl: "https://nft.fragment.com/gift/DiamondRing/preview.webp",
  },
  HomemadeCake: {
    id: "homemade-cake",
    nftId: "HomemadeCake",
    collectionName: "Homemade Cake",
    collectionSlug: "HomemadeCake",
    giftName: "Homemade Cake",
    rarity: "common",
    imageUrl: "https://nft.fragment.com/gift/HomemadeCake/preview.webp",
  },
  BerryBox: {
    id: "berry-box",
    nftId: "BerryBox",
    collectionName: "Berry Box",
    collectionSlug: "BerryBox",
    giftName: "Berry Box",
    rarity: "uncommon",
    imageUrl: "https://nft.fragment.com/gift/BerryBox/preview.webp",
  },
}

export function getNFTInfo(nftId: string): NFTGift | undefined {
  // Try exact match first
  if (NFT_COLLECTIONS[nftId]) {
    return NFT_COLLECTIONS[nftId]
  }

  // Try to extract collection name from nftId (e.g., "IonicDryer-7561" -> "IonicDryer")
  const parts = nftId.split("-")
  if (parts.length > 1) {
    const collectionSlug = parts[0]
    const number = parts[1]

    // Find by collection slug
    for (const [key, nft] of Object.entries(NFT_COLLECTIONS)) {
      if (nft.collectionSlug === collectionSlug) {
        return {
          ...nft,
          nftId: nftId,
          giftName: `${nft.collectionName} #${number}`,
          number: Number.parseInt(number),
          imageUrl: `https://nft.fragment.com/gift/${collectionSlug}/${number}.webp`,
        }
      }
    }
  }

  return undefined
}

export function getRarityColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case "legendary":
      return "text-yellow-400"
    case "epic":
      return "text-purple-400"
    case "rare":
      return "text-blue-400"
    case "uncommon":
      return "text-green-400"
    default:
      return "text-muted-foreground"
  }
}

export function getRarityBgColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case "legendary":
      return "bg-yellow-500/20 border-yellow-500/50"
    case "epic":
      return "bg-purple-500/20 border-purple-500/50"
    case "rare":
      return "bg-blue-500/20 border-blue-500/50"
    case "uncommon":
      return "bg-green-500/20 border-green-500/50"
    default:
      return "bg-card border-border/50"
  }
}
