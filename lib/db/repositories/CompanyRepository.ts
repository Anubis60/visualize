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
    return collection.findOne({ whopCompanyId })
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
      { whopCompanyId },
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
      { whopCompanyId },
      {
        $set: {
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        }
      }
    )
    return result.modifiedCount > 0
  }
}

export const companyRepository = new CompanyRepository()
