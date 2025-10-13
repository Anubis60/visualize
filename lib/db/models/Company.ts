import { ObjectId } from 'mongodb'

// Company model - stores full Whop company data
export interface Company {
  _id?: ObjectId
  companyId: string // biz_xxxxx (Whop company ID)
  title: string
  route: string
  logo?: {
    __typename?: string
    sourceUrl?: string
  } | string | null
  industryType?: string
  businessType?: string
  userId?: string | null
  rawData?: unknown // Full Whop company object
  settings?: {
    defaultCurrency: string
    timezone: string
  }
  createdAt: Date
  updatedAt: Date
  lastSyncAt?: Date
}
