import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as docdb from 'aws-cdk-lib/aws-docdb';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

import { Construct } from 'constructs';
import { getRemovalPolicyFromStage } from '../utils';

interface GilmoreClothingStatelessStackProps extends cdk.StackProps {
  stage: string;
  stageTypeName: string;
  table: dynamodb.Table;
  port: number;
  databaseCredentialsKey: string;
  databaseName: string;
  databaseCollectionName: string;
}

export class GilmoreClothingStatelessStack extends cdk.Stack {
  private table: dynamodb.Table;

  constructor(
    scope: Construct,
    id: string,
    props: GilmoreClothingStatelessStackProps
  ) {
    super(scope, id, props);

    const {
      stage,
      stageTypeName,
      table,
      port,
      databaseCredentialsKey,
      databaseCollectionName,
      databaseName,
    } = props;

    this.table = table;

    // import the vpc (for all ephemeral this is develop)
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcName: `gilmore-clothing-vpc-${stageTypeName}`,
    });

    // import our docdb exports (for all ephemeral this is develop)
    const docdbClusterIdentifier = cdk.Fn.importValue(
      `${stageTypeName}-DocDb-cluster-identifier`
    );

    const docdbClusterEndpoint = cdk.Fn.importValue(
      `${stageTypeName}-DocDb-cluster-endpoint`
    );

    // import the database cluster properties (for all ephemeral this is develop)
    const docDbCluster = docdb.DatabaseCluster.fromDatabaseClusterAttributes(
      this,
      'DocDbCluster',
      {
        clusterIdentifier: docdbClusterIdentifier,
        clusterEndpointAddress: docdbClusterEndpoint,
        port,
      }
    );

    const lambdaPowerToolsConfig = {
      LOG_LEVEL: 'DEBUG',
      POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
      POWERTOOLS_TRACE_ENABLED: 'enabled',
      POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: 'captureHTTPsRequests',
      POWERTOOLS_SERVICE_NAME: `gilmore-clothing-service-${stage}`,
      POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'captureResult',
      POWERTOOLS_METRICS_NAMESPACE: `gilmore-clothing-${stage}`,
    };

    const lambdaSecretsExtensionConfig = {
      PARAMETERS_SECRETS_EXTENSION_HTTP_PORT: '2773',
      PARAMETERS_SECRETS_EXTENSION_LOG_LEVEL: 'debug',
    };

    const documentDbConfig = {
      MONGO_DB: databaseName,
      MONGO_PASSWORD_SECRETS_MANAGER_KEY: databaseCredentialsKey,
      MONGO_COLLECTION: databaseCollectionName,
    };

    // create the lambda for creating products
    const createProductLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'CreateProductLambda', {
        functionName: `create-product-lambda-${stage}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          './src/adapters/primary/create-product/create-product.adapter.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        bundling: {
          minify: true,
        },
        environment: {
          ...lambdaPowerToolsConfig,
          TABLE_NAME: this.table.tableName,
        },
      });

    // create the lambda layer
    const docdbPemFileLayer: lambda.LayerVersion = new lambda.LayerVersion(
      this,
      'DocDbPemFileLayer',
      {
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        code: lambda.Code.fromAsset(
          path.join(__dirname, './src/layer/global-bundle.pem.zip')
        ),
        layerVersionName: `docdb-pem-file-layer-${stage}`,
        description: 'documentdb pem file layer',
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );
    docdbPemFileLayer.applyRemovalPolicy(getRemovalPolicyFromStage(stage));

    // create the lambda for listing products from documentdb
    const listProductsLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'ListProductsLambda', {
        functionName: `list-products-lambda-${stage}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        timeout: cdk.Duration.seconds(20),
        entry: path.join(
          __dirname,
          './src/adapters/primary/list-products/list-products.adapter.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        layers: [docdbPemFileLayer],
        vpc: vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        bundling: {
          minify: true,
        },
        environment: {
          ...lambdaPowerToolsConfig,
          ...lambdaSecretsExtensionConfig,
          ...documentDbConfig,
        },
      });

    // allow the lambda function to create products in the table
    this.table.grantWriteData(createProductLambda);

    // create the api to allow us to create a new product
    const api: apigw.RestApi = new apigw.RestApi(this, 'Api', {
      description: `clothing products api ${stage}`,
      restApiName: `clothing-products-domain-api-${stage}`,
      deploy: true,
      deployOptions: {
        stageName: 'api',
        dataTraceEnabled: true,
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        tracingEnabled: true,
        metricsEnabled: true,
      },
    });

    const apiRoot: apigw.Resource = api.root.addResource('v1');
    const ordersResource: apigw.Resource = apiRoot.addResource('products');

    ordersResource.addMethod(
      'POST',
      new apigw.LambdaIntegration(createProductLambda, {
        proxy: true,
      })
    );

    ordersResource.addMethod(
      'GET',
      new apigw.LambdaIntegration(listProductsLambda, {
        proxy: true,
      })
    );

    // create the lambda for streaming new products to documentdb
    const streamProductLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'StreamProductLambda', {
        functionName: `stream-product-lambda-${stage}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        timeout: cdk.Duration.seconds(20),
        entry: path.join(
          __dirname,
          './src/adapters/primary/stream-product/stream-product.adapter.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        layers: [docdbPemFileLayer],
        vpc: vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        bundling: {
          minify: true,
        },
        environment: {
          ...lambdaPowerToolsConfig,
          ...lambdaSecretsExtensionConfig,
          ...documentDbConfig,
        },
      });

    streamProductLambda.addLayers(
      lambda.LayerVersion.fromLayerVersionArn(
        this,
        'StreamSecretsExtension',
        `arn:aws:lambda:${this.region}:015030872274:layer:AWS-Parameters-and-Secrets-Lambda-Extension:11`
      )
    );

    // add the layers to the two functions
    listProductsLambda.addLayers(
      lambda.LayerVersion.fromLayerVersionArn(
        this,
        'ListSecretsExtension',
        `arn:aws:lambda:${this.region}:015030872274:layer:AWS-Parameters-and-Secrets-Lambda-Extension:11`
      )
    );

    // Grant permissions to access Secrets Manager
    streamProductLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: ['arn:aws:secretsmanager:*:*:secret:*'],
      })
    );

    listProductsLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: ['arn:aws:secretsmanager:*:*:secret:*'],
      })
    );

    docDbCluster.connections.allowFrom(
      streamProductLambda,
      ec2.Port.tcp(27017),
      'allow inbound from lambda only'
    );

    docDbCluster.connections.allowFrom(
      listProductsLambda,
      ec2.Port.tcp(27017),
      'allow inbound from lambda only'
    );

    // add the lambda as an event source for the dynamodb table
    streamProductLambda.addEventSource(
      new lambdaEventSources.DynamoEventSource(this.table, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 1,
        retryAttempts: 10,
        reportBatchItemFailures: true,
      })
    );
  }
}
