import { getDatabase } from '../mongodb'
import { Company } from '../models/Company'
import { ObjectId } from 'mongodb'

export class CompanyRepository {
  private async getCollection() {
    const db = await getDatabase()
    return db.collection<Company>('companies')
  }

  async findByWhopCompanyId(whopCompanyId: string): Promise<Company | null> {
    const collection = await this.getCollection()
    return collection.findOne({ companyId: whopCompanyId })
  }

  async findById(id: string): Promise<Company | null> {
    const collection = await this.getCollection()
    return collection.findOne({ _id: new ObjectId(id) })
  }

  async create(company: Omit<Company, '_id'>): Promise<Company> {
    const collection = await this.getCollection()
    const result = await collection.insertOne({
      ...company,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Company)

    return {
      ...company,
      _id: result.insertedId,
    } as Company
  }

  async update(whopCompanyId: string, updates: Partial<Company>): Promise<boolean> {
    const collection = await this.getCollection()
    const result = await collection.updateOne(
      { companyId: whopCompanyId },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        }
      }
    )
    return result.modifiedCount > 0
  }

  async updateLastSync(whopCompanyId: string): Promise<boolean> {
    const collection = await this.getCollection()
    const result = await collection.updateOne(
      { companyId: whopCompanyId },
      {
        $set: {
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        }
      }
    )
    return result.modifiedCount > 0
  }

  /**
   * Get all registered companies (for snapshot capture)
   */
  async getAllCompanies(): Promise<Company[]> {
    const collection = await this.getCollection()
    return collection.find({}).toArray()
  }

  /**
   * Mark company's initial backfill as completed
   */
  async markBackfillCompleted(whopCompanyId: string): Promise<boolean> {
    const collection = await this.getCollection()
    const result = await collection.updateOne(
      { companyId: whopCompanyId },
      {
        $set: {
          backfillCompleted: true,
          backfillCompletedAt: new Date(),
          updatedAt: new Date(),
        }
      }
    )
    return result.modifiedCount > 0
  }

  /**
   * Get companies that need initial backfill
   */
  async getCompaniesNeedingBackfill(): Promise<Company[]> {
    const collection = await this.getCollection()
    return collection.find({
      $or: [
        { backfillCompleted: { $exists: false } },
        { backfillCompleted: false }
      ]
    }).toArray()
  }

  /**
   * Get companies that have completed backfill
   */
  async getCompaniesWithBackfill(): Promise<Company[]> {
    const collection = await this.getCollection()
    return collection.find({ backfillCompleted: true }).toArray()
  }

  /**
   * Register a company (upsert - create if doesn't exist, update if exists)
   * Stores full company data from Whop API
   */
  async registerCompany(companyData: {
    id: string
    title: string
    route: string
    logo?: unknown
    bannerImage?: unknown
    industryType?: string
    businessType?: string
    userId?: string | null
    rawData?: unknown
  }): Promise<Company> {
    const collection = await this.getCollection()

    const now = new Date()

    // Build the update object with proper types
    const updateData: Record<string, unknown> = {
      title: companyData.title,
      route: companyData.route,
      industryType: companyData.industryType,
      businessType: companyData.businessType,
      userId: companyData.userId,
      rawData: companyData.rawData,
      updatedAt: now,
    }

    // Add logo and bannerImage if provided
    if (companyData.logo !== undefined) {
      updateData.logo = companyData.logo
    }
    if (companyData.bannerImage !== undefined) {
      updateData.bannerImage = companyData.bannerImage
    }

    const result = await collection.findOneAndUpdate(
      { companyId: companyData.id },
      {
        $set: updateData,
        $setOnInsert: {
          companyId: companyData.id,
          createdAt: now,
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    )

    return result as Company
  }
}

export const companyRepository = new CompanyRepository()
