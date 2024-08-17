import { Product } from '@dto/product';
import { listProducts } from '@adapters/secondary/documentdb-adapter';

export async function listProductsUseCase(): Promise<Product[]> {
  return await listProducts();
}
