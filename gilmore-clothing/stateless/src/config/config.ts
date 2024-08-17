import convict = require('convict');

export const config = convict({
  tableName: {
    doc: 'The dynamodb products table',
    default: '',
    env: 'TABLE_NAME',
    nullable: false,
  },
  mongoDatabase: {
    doc: 'The documentdb database i.e. products-develop',
    default: '',
    env: 'MONGO_DB',
    nullable: false,
  },
  mongoPasswordKey: {
    doc: 'The secrets manager key for mongo password',
    default: '',
    env: 'MONGO_PASSWORD_SECRETS_MANAGER_KEY',
    nullable: false,
  },
  mongoCollection: {
    doc: 'The documentdb database collection e.g. products',
    default: '',
    env: 'MONGO_COLLECTION',
    nullable: false,
  },
});
