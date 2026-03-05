import { MongoClient, ServerApiVersion } from 'mongodb';

const mongoOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (clientPromise) return clientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');

  if (process.env.NODE_ENV === 'development') {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = new MongoClient(uri, mongoOptions).connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    clientPromise = new MongoClient(uri, mongoOptions).connect();
  }

  return clientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db('grimoire-tool');
}
