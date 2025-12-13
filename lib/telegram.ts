// Telegram WebApp TypeScript definitions and utilities

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: WebAppInitData
  version: string
  platform: string
  colorScheme: "light" | "dark"
  themeParams: ThemeParams
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  isClosingConfirmationEnabled: boolean
  isVerticalSwipesEnabled: boolean
  BackButton: BackButton
  MainButton: BottomButton
  SecondaryButton: BottomButton
  HapticFeedback: HapticFeedback
  CloudStorage: CloudStorage
  isVersionAtLeast: (version: string) => boolean
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  setBottomBarColor: (color: string) => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  enableVerticalSwipes: () => void
  disableVerticalSwipes: () => void
  onEvent: (eventType: string, eventHandler: Function) => void
  offEvent: (eventType: string, eventHandler: Function) => void
  sendData: (data: string) => void
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void
  openTelegramLink: (url: string) => void
  openInvoice: (url: string, callback?: (status: string) => void) => void
  showPopup: (params: PopupParams, callback?: (buttonId: string) => void) => void
  showAlert: (message: string, callback?: () => void) => void
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void
  showScanQrPopup: (params: ScanQrPopupParams, callback?: (text: string) => boolean) => void
  closeScanQrPopup: () => void
  readTextFromClipboard: (callback?: (text: string) => void) => void
  requestWriteAccess: (callback?: (granted: boolean) => void) => void
  requestContact: (callback?: (shared: boolean) => void) => void
  ready: () => void
  expand: () => void
  close: () => void
}

export interface WebAppInitData {
  query_id?: string
  user?: WebAppUser
  receiver?: WebAppUser
  chat?: WebAppChat
  chat_type?: string
  chat_instance?: string
  start_param?: string
  can_send_after?: number
  auth_date?: number
  hash?: string
}

export interface WebAppUser {
  id: number
  is_bot?: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  added_to_attachment_menu?: boolean
  allows_write_to_pm?: boolean
  photo_url?: string
}

export interface WebAppChat {
  id: number
  type: string
  title: string
  username?: string
  photo_url?: string
}

export interface ThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
  header_bg_color?: string
  accent_text_color?: string
  section_bg_color?: string
  section_header_text_color?: string
  subtitle_text_color?: string
  destructive_text_color?: string
}

export interface BackButton {
  isVisible: boolean
  onClick: (callback: () => void) => void
  offClick: (callback: () => void) => void
  show: () => void
  hide: () => void
}

export interface BottomButton {
  text: string
  color: string
  textColor: string
  isVisible: boolean
  isActive: boolean
  isProgressVisible: boolean
  setText: (text: string) => BottomButton
  onClick: (callback: () => void) => BottomButton
  offClick: (callback: () => void) => BottomButton
  show: () => BottomButton
  hide: () => BottomButton
  enable: () => BottomButton
  disable: () => BottomButton
  showProgress: (leaveActive?: boolean) => BottomButton
  hideProgress: () => BottomButton
  setParams: (params: {
    text?: string
    color?: string
    text_color?: string
    is_active?: boolean
    is_visible?: boolean
  }) => BottomButton
}

export interface HapticFeedback {
  impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => HapticFeedback
  notificationOccurred: (type: "error" | "success" | "warning") => HapticFeedback
  selectionChanged: () => HapticFeedback
}

export interface CloudStorage {
  setItem: (key: string, value: string, callback?: (error: Error | null, stored: boolean) => void) => CloudStorage
  getItem: (key: string, callback: (error: Error | null, value: string) => void) => CloudStorage
  getItems: (keys: string[], callback: (error: Error | null, values: Record<string, string>) => void) => CloudStorage
  removeItem: (key: string, callback?: (error: Error | null, removed: boolean) => void) => CloudStorage
  removeItems: (keys: string[], callback?: (error: Error | null, removed: boolean) => void) => CloudStorage
  getKeys: (callback: (error: Error | null, keys: string[]) => void) => CloudStorage
}

export interface PopupParams {
  title?: string
  message: string
  buttons?: PopupButton[]
}

export interface PopupButton {
  id?: string
  type?: "default" | "ok" | "close" | "cancel" | "destructive"
  text?: string
}

export interface ScanQrPopupParams {
  text?: string
}

// Helper functions
export function getTelegram(): TelegramWebApp | null {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp
  }
  return null
}

export function isTelegramWebApp(): boolean {
  return getTelegram() !== null
}

export function getTelegramUser(): WebAppUser | null {
  const tg = getTelegram()
  return tg?.initDataUnsafe?.user || null
}

export function hapticFeedback(type: "light" | "medium" | "heavy" | "success" | "error" | "warning" | "selection") {
  const tg = getTelegram()
  if (!tg?.HapticFeedback) return

  if (type === "selection") {
    tg.HapticFeedback.selectionChanged()
  } else if (["success", "error", "warning"].includes(type)) {
    tg.HapticFeedback.notificationOccurred(type as "success" | "error" | "warning")
  } else {
    tg.HapticFeedback.impactOccurred(type as "light" | "medium" | "heavy")
  }
}
