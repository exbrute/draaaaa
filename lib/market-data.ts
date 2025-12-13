import { getGiftUrls } from "./utils"

export interface MarketItem {
  name: string
  id: string
  price: string
  color: string
  collection: string
  animationUrl: string
  fallbackImage: string
  lottieUrl?: string
}

export const ionicDryerGifts: MarketItem[] = [
  {
    name: "Ionic Dryer",
    id: "#7561",
    price: "18.50",
    color: "bg-cyan-600",
    collection: "Ionic Dryers",
    animationUrl: "https://nft.fragment.com/gift/ionicdryer-7561.tgs",
    fallbackImage: "https://nft.fragment.com/gift/ionicdryer-7561.webp",
    lottieUrl: "https://nft.fragment.com/gift/ionicdryer-7561.lottie.json",
  },
  {
    name: "Ionic Dryer",
    id: "#3421",
    price: "12.75",
    color: "bg-cyan-600",
    collection: "Ionic Dryers",
    animationUrl: "https://nft.fragment.com/gift/ionicdryer-3421.tgs",
    fallbackImage: "https://nft.fragment.com/gift/ionicdryer-3421.webp",
    lottieUrl: "https://nft.fragment.com/gift/ionicdryer-3421.lottie.json",
  },
]

export const plushPepeGifts: MarketItem[] = [
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
]
