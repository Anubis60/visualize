import { Membership, Plan } from '@/lib/types/analytics'
import { Payment } from '@/lib/analytics/transactions'

const WHOP_API_BASE = 'https://api.whop.com/api/v2'

interface WhopPagination {
  current_page: number
  total_pages: number
  total_count: number
  per_page: number
}

interface WhopMembershipsResponse {
  data: Membership[]
  pagination: WhopPagination
}

export class WhopClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${WHOP_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Whop API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getMemberships(params?: {
    company_id?: string
    status?: string
    valid?: boolean
    page?: number
    per?: number
  }): Promise<{ data: Membership[], pagination: WhopPagination }> {
    const searchParams = new URLSearchParams()

    if (params?.company_id) searchParams.set('company_id', params.company_id)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.valid !== undefined) searchParams.set('valid', String(params.valid))
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.per) searchParams.set('per', String(params.per))

    const result = await this.fetch<WhopMembershipsResponse>(
      `/memberships?${searchParams.toString()}`
    )

    return {
      data: result.data || [],
      pagination: result.pagination || { current_page: 1, total_pages: 1, total_count: 0, per_page: 10 }
    }
  }

  async getAllMemberships(companyId: string): Promise<Membership[]> {
    const allMemberships: Membership[] = []
    let hasMore = true
    let cursor: string | undefined = undefined

    while (hasMore) {
      const url = new URL('https://api.whop.com/api/v1/memberships')
      url.searchParams.set('company_id', companyId)
      url.searchParams.set('first', '100')
      if (cursor) {
        url.searchParams.set('after', cursor)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Whop API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const memberships = data.data || []

      if (memberships.length === 0) {
        hasMore = false
      } else {
        allMemberships.push(...memberships)

        const pageInfo = data.page_info
        if (pageInfo && pageInfo.has_next_page && pageInfo.end_cursor) {
          cursor = pageInfo.end_cursor
        } else {
          hasMore = false
        }
      }
    }

    return allMemberships
  }

  async getAllPayments(companyId: string): Promise<Payment[]> {
    const allPayments: Payment[] = []
    let hasMore = true
    let cursor: string | undefined = undefined

    while (hasMore) {
      const url = new URL('https://api.whop.com/api/v1/payments')
      url.searchParams.set('company_id', companyId)
      url.searchParams.set('first', '100')
      if (cursor) {
        url.searchParams.set('after', cursor)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Whop API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const payments = data.data || []

      if (payments.length === 0) {
        hasMore = false
      } else {
        allPayments.push(...payments)

        const pageInfo = data.page_info
        if (pageInfo && pageInfo.has_next_page && pageInfo.end_cursor) {
          cursor = pageInfo.end_cursor
        } else {
          hasMore = false
        }
      }
    }

    return allPayments
  }

  async getAllPlans(companyId: string): Promise<Plan[]> {
    const url = new URL('https://api.whop.com/api/v1/plans')
    url.searchParams.set('company_id', companyId)

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Whop API Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || []
  }
}

// Singleton instance
export const whopClient = new WhopClient(process.env.WHOP_API_KEY!)
