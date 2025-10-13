import { ObjectId } from 'mongodb'

// Company model - stores full Whop company data
export interface Company {
  _id?: ObjectId
  companyId: string // biz_xxxxx (Whop company ID)
  title: string
  route: string
  logo?: unknown // Can be string, ImageAttachment object, or other Whop attachment types
  bannerImage?: unknown // Can be string, ImageAttachment object, or other Whop attachment types
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
  backfillCompleted?: boolean // Track if initial 365-day historical data capture is complete
  backfillCompletedAt?: Date // When the backfill was completed
}
