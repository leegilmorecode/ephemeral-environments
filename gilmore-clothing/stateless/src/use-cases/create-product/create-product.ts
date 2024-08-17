import { CreateProduct, Product } from '@dto/product';
import { getISOString, schemaValidator } from '@shared';

import { config } from '@config';
import { schema } from '@schemas/product';
import { upsert } from '@adapters/secondary/dynamodb-adapter';
import { v4 as uuid } from 'uuid';

const tableName = config.get('tableName');

export async function createProductUseCase(
  newProduct: CreateProduct
): Promise<Product> {
  const createdDate = getISOString();

  const product: Product = {
    ...newProduct,
    id: uuid(),
    created: createdDate,
    updated: createdDate,
  };

  schemaValidator(schema, product);

  const createdProduct = await upsert<Product>(product, tableName, product.id);

  return createdProduct;
}
