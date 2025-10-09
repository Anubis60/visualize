import { ObjectId } from 'mongodb'

// Simple company model - just for storing basic info
// No authentication needed since Whop handles that
export interface Company {
  _id?: ObjectId
  whopCompanyId: string // biz_xxxxx
  companyName: string
  settings?: {
    defaultCurrency: string
    timezone: string
  }
  createdAt: Date
  updatedAt: Date
  lastSyncAt?: Date
}
