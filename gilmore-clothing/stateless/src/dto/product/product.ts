export type ClothingSize =
  | 'XS'
  | 'S'
  | 'M'
  | 'L'
  | 'XL'
  | 'XXL'
  | '3XL'
  | '4XL';
export type Gender = 'Men' | 'Women' | 'Unisex' | 'Kids';
export type ClothingCategory =
  | 'T-Shirt'
  | 'Shirt'
  | 'Pants'
  | 'Jeans'
  | 'Dress'
  | 'Skirt'
  | 'Shorts'
  | 'Sweater'
  | 'Jacket'
  | 'Shoes'
  | 'Accessories';

export type ClothingColour =
  | 'Red'
  | 'Blue'
  | 'Green'
  | 'Black'
  | 'White'
  | 'Gray'
  | 'Yellow'
  | 'Purple'
  | 'Pink'
  | 'Brown'
  | 'Orange'
  | string;

export interface Product {
  id: string;
  created: string;
  updated: string;
  name: string;
  description: string;
  brand: string;
  category: ClothingCategory;
  gender: Gender;
  sizes: ClothingSize[];
  colors: ClothingColour[];
  price: number;
  inStock: boolean;
  material: string;
}

export interface CreateProduct {
  name: string;
  description: string;
  brand: string;
  category: ClothingCategory;
  gender: Gender;
  sizes: ClothingSize[];
  colors: ClothingColour[];
  price: number;
  inStock: boolean;
  material: string;
}
