import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGO_URI
const options = {}

let client: MongoClient | null = null
let clientPromise: Promise<MongoClient> | null = null

// Only initialize MongoDB connection if MONGO_URI is provided
// This allows the build to succeed even without a database connection
if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable to preserve the value across module reloads
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options)
      globalWithMongo._mongoClientPromise = client.connect()
    }
    clientPromise = globalWithMongo._mongoClientPromise
  } else {
    // In production mode, it's best to not use a global variable
    client = new MongoClient(uri, options)
    clientPromise = client.connect()
  }
}

// Export a module-scoped MongoClient promise
export default clientPromise

// Helper function to get the database
export async function getDatabase(): Promise<Db> {
  if (!clientPromise) {
    throw new Error('Please add your MONGO_URI to .env.local or environment variables')
  }
  const client = await clientPromise
  return client.db('financier')
}

// Initialize database indexes
export async function initializeIndexes(): Promise<void> {
  try {
    const db = await getDatabase()

    // Create indexes for metrics_snapshots collection
    const metricsCollection = db.collection('metrics_snapshots')

    // Compound index for companyId + date (used in queries and sorting)
    await metricsCollection.createIndex(
      { companyId: 1, date: -1 },
      { name: 'companyId_date_idx' }
    )

    // Index for timestamp queries
    await metricsCollection.createIndex(
      { timestamp: -1 },
      { name: 'timestamp_idx' }
    )

  } catch {
    // Ignore errors during cleanup
  }
}
