import { Product } from '@dto/product';
import { createProduct } from '@adapters/secondary/documentdb-adapter';
import { logger } from '@shared';

export async function streamProduct(product: Product): Promise<Product> {
  logger.info(`streaming product: ${JSON.stringify(product)}`);

  const createdProduct = await createProduct(product);
  return createdProduct;
}
