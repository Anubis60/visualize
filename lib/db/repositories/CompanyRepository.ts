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
    const result = await collection.findOneAndUpdate(
      { companyId: companyData.id },
      {
        $set: {
          title: companyData.title,
          route: companyData.route,
          logo: companyData.logo,
          industryType: companyData.industryType,
          businessType: companyData.businessType,
          userId: companyData.userId,
          rawData: companyData.rawData,
          updatedAt: now,
        },
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
