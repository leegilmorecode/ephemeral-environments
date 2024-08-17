import * as cdk from 'aws-cdk-lib';
import * as docdb from 'aws-cdk-lib/aws-docdb';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import { Construct } from 'constructs';
import { Stage } from '../types';
import { getRemovalPolicyFromStage } from '../utils';

interface GilmoreClothingStatefulStackProps extends cdk.StackProps {
  stage: string;
  stageTypeName: string;
  port: number;
}

export class GilmoreClothingStatefulStack extends cdk.Stack {
  public table: dynamodb.Table;

  constructor(
    scope: Construct,
    id: string,
    props: GilmoreClothingStatefulStackProps
  ) {
    super(scope, id, props);

    const { stage, stageTypeName, port } = props;

    let vpc: ec2.IVpc;

    // create the vpc for the documentdb cluster if stage is not ephemeral
    // Note: prod, test, and staging have their own dedicated versions - ephemeral share develop
    if (
      stage === Stage.develop ||
      stage === Stage.test ||
      stage === Stage.staging ||
      stage === Stage.prod
    ) {
      vpc = new ec2.Vpc(this, 'Vpc', {
        vpcName: `gilmore-clothing-vpc-${stageTypeName}`, // this will be develop for ephemeral (shared)
        maxAzs: 2,
        natGateways: 1,
        subnetConfiguration: [
          {
            cidrMask: 24,
            name: 'private-subnet',
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          },
          {
            cidrMask: 24,
            name: 'public-subnet',
            subnetType: ec2.SubnetType.PUBLIC,
          },
        ],
      });
      vpc.applyRemovalPolicy(getRemovalPolicyFromStage(stage));

      // create the documentdb cluster if stage is not ephemeral
      const docdbCluster = new docdb.DatabaseCluster(this, 'DocDbCluster', {
        masterUser: {
          username: 'adminuser',
          secretName: `/product-service-${stageTypeName}/docdb/masterpassword`, // this will be develop for ephemeral (shared)
          excludeCharacters: '\'"@/:`$<>#|%{}[]!?^\\.~*()',
        },
        port,
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          ec2.InstanceSize.MEDIUM
        ),
        dbClusterName: `docdb-products-cluster-${stageTypeName}`,
        deletionProtection: false,
        removalPolicy: getRemovalPolicyFromStage(stage),
        storageEncrypted: true,
        engineVersion: '5.0.0',
        instances: 1,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        vpc,
      });

      docdbCluster.connections.allowFrom(
        ec2.Peer.ipv4(vpc.vpcCidrBlock),
        ec2.Port.tcp(27017)
      );

      new cdk.CfnOutput(this, 'DocDBClusterIdentifier', {
        value: docdbCluster.clusterIdentifier,
        exportName: `${stageTypeName}-DocDb-cluster-identifier`,
        description: `The identifier of the DocumentDB cluster in ${stageTypeName}`,
      });

      new cdk.CfnOutput(this, 'DocDBClusterEndpoint', {
        value: docdbCluster.clusterEndpoint.hostname,
        exportName: `${stageTypeName}-DocDb-cluster-endpoint`,
        description: `The endpoint of the DocumentDB cluster in ${stageTypeName}`,
      });
    }

    // create the table to store our products
    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `gilmore-clothing-table-${stage}`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: getRemovalPolicyFromStage(stage),
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });
  }
}
