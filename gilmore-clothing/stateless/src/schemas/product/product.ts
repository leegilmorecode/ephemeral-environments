export const schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Product',
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    created: {
      type: 'string',
      format: 'date-time',
    },
    updated: {
      type: 'string',
      format: 'date-time',
    },
    name: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    brand: {
      type: 'string',
    },
    category: {
      type: 'string',
      enum: [
        'T-Shirt',
        'Shirt',
        'Pants',
        'Jeans',
        'Dress',
        'Skirt',
        'Shorts',
        'Sweater',
        'Jacket',
        'Shoes',
        'Accessories',
      ],
    },
    gender: {
      type: 'string',
      enum: ['Men', 'Women', 'Unisex', 'Kids'],
    },
    sizes: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
      },
    },
    colors: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    price: {
      type: 'number',
      minimum: 0,
    },
    inStock: {
      type: 'boolean',
    },
    material: {
      type: 'string',
    },
  },
  required: [
    'id',
    'created',
    'updated',
    'name',
    'description',
    'brand',
    'category',
    'gender',
    'sizes',
    'colors',
    'price',
    'inStock',
    'material',
  ],
  additionalProperties: false,
};
