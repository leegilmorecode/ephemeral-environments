import { Collection, Db, MongoClient, MongoClientOptions } from 'mongodb';

import { Product } from '@dto/product';
import { config } from '@config';
import { getSecret } from '@adapters/secondary/secrets-manager-adapter';
import { logger } from '@shared';

const mongoDatabase = config.get('mongoDatabase');
const mongoCollection = config.get('mongoCollection');

let cachedDb: Db | null = null;

interface DocumentDbSecret {
  password: string;
  dbClusterIdentifier: string;
  host: string;
  username: string;
  port: string;
}

export async function listProducts(): Promise<Product[]> {
  logger.info(
    `listing products from db ${mongoDatabase} and collection ${mongoCollection}`
  );

  const db = await databaseConnect();

  const collection: Collection<any> = db.collection(mongoCollection);

  const products = await collection.find({}).toArray();

  return products;
}

export async function createProduct(product: Product): Promise<Product> {
  logger.info(
    `writing product ${JSON.stringify(
      product
    )} into db ${mongoDatabase} and collection ${mongoCollection}`
  );

  const db = await databaseConnect();

  const collection: Collection<any> = db.collection(mongoCollection);

  const insertResult = await collection.insertOne({
    _id: product.id,
    ...product,
  });

  logger.info(`inserted product ${insertResult.insertedId} successfully`);

  return product;
}

async function databaseConnect(): Promise<Db> {
  try {
    if (cachedDb) {
      logger.debug('using cached database connection');
      return cachedDb;
    }

    const client = await buildMongoClient();
    cachedDb = await connectToDatabase(client);

    return cachedDb;
  } catch (error) {
    logger.error(`error connecting to database: ${error}`);
    throw new Error('unable to connect to database');
  }
}

async function connectToDatabase(client: MongoClient): Promise<Db> {
  await client.connect();

  const db = client.db(mongoDatabase as string);

  return db;
}

async function buildMongoClient(
  minPoolSize = 1,
  maxPoolSize = 1
): Promise<MongoClient> {
  const mongoPasswordKey = config.get('mongoPasswordKey');

  // get the secret from secrets manager using the lambda extension
  const { password, username, host, port } = await getSecret<DocumentDbSecret>(
    mongoPasswordKey
  );

  const url = `mongodb://${username}:${password}@${host}:${port}/${mongoDatabase}?replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;

  const options: MongoClientOptions = {
    tls: true,
    tlsCAFile: '/opt/global-bundle.pem',
    minPoolSize,
    maxPoolSize,
  };

  return new MongoClient(url, options);
}
