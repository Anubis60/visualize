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
  rawData?: unknown // Full Whop company object from SDK
  createdAt: Date
  updatedAt: Date
}
