import { Membership } from '@/lib/types/analytics'

const WHOP_API_BASE = 'https://api.whop.com/api/v2'

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
  }): Promise<{ data: Membership[], pagination: any }> {
    const searchParams = new URLSearchParams()

    if (params?.company_id) searchParams.set('company_id', params.company_id)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.valid !== undefined) searchParams.set('valid', String(params.valid))
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.per) searchParams.set('per', String(params.per))

    // Expand plan, product, and user data
    searchParams.append('expand[]', 'plan')
    searchParams.append('expand[]', 'product')
    searchParams.append('expand[]', 'user')

    const result = await this.fetch<any>(
      `/memberships?${searchParams.toString()}`
    )

    return {
      data: result.data || [],
      pagination: result.pagination || {}
    }
  }

  async getAllMemberships(companyId: string): Promise<Membership[]> {
    const allMemberships: Membership[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const result = await this.getMemberships({
        company_id: companyId,
        page,
        per: 50
      })

      allMemberships.push(...result.data)

      hasMore = result.pagination.current_page < result.pagination.total_pages
      page++
    }

    return allMemberships
  }
}

// Singleton instance
export const whopClient = new WhopClient(process.env.WHOP_API_KEY!)
