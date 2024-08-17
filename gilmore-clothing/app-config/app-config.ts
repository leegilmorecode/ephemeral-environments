import { Region, Stage } from '../types';

export interface EnvironmentConfig {
  databasePort: number;
  databaseName: string;
  databaseCollectionName: string;
  databaseCredentialsKey: string;
  env: {
    account: string;
    region: string;
  };
}

// static app config per environment
// Note: you would have different account Ids per environment for test, staging and prod (develop is shared)
export const getEnvironmentConfig = (
  stage: Stage,
  stageTypeName: string
): EnvironmentConfig => {
  switch (stageTypeName) {
    case Stage.test:
      return {
        databasePort: 27017,
        databaseCredentialsKey: `/product-service-${Stage.test}/docdb/masterpassword`,
        databaseName: 'products',
        databaseCollectionName: 'products',
        env: {
          account: process.env.CDK_DEFAULT_ACCOUNT as string,
          region: Region.dublin,
        },
      };
    case Stage.staging:
      return {
        databasePort: 27017,
        databaseCredentialsKey: `/product-service-${Stage.staging}/docdb/masterpassword`,
        databaseName: 'products',
        databaseCollectionName: 'products',
        env: {
          account: process.env.CDK_DEFAULT_ACCOUNT as string,
          region: Region.dublin,
        },
      };
    case Stage.prod:
      return {
        databasePort: 27017,
        databaseCredentialsKey: `/product-service-${Stage.prod}/docdb/masterpassword`,
        databaseName: 'products',
        databaseCollectionName: 'products',
        env: {
          account: process.env.CDK_DEFAULT_ACCOUNT as string,
          region: Region.dublin,
        },
      };
    case Stage.develop:
    default:
      return {
        databasePort: 27017,
        databaseCredentialsKey: `/product-service-${stageTypeName}/docdb/masterpassword`,
        databaseName: `products-${stage}`,
        databaseCollectionName: `products-${stage}`,
        env: {
          account: process.env.CDK_DEFAULT_ACCOUNT as string,
          region: Region.dublin,
        },
      };
  }
};
