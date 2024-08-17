#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';

import { getStage, getStageType } from '../utils';

import { GilmoreClothingStatefulStack } from '../stateful/stateful';
import { GilmoreClothingStatelessStack } from '../stateless/stateless';
import { Stage } from '../types';
import { getEnvironmentConfig } from '../app-config';

const app = new cdk.App();

// get the correct stage and stage type based on the process.env.STAGE env var
// stageType for all ephemeral environments is develop
const stage = getStage(process.env.STAGE as Stage) as Stage;
const stageTypeName = getStageType(stage);

// get the correct app config for environment
const appConfig = getEnvironmentConfig(stage, stageTypeName);

const statefulStack = new GilmoreClothingStatefulStack(
  app,
  `${stage}-GilmoreClothingStatefulStack`,
  {
    stage,
    stageTypeName,
    env: appConfig.env,
    port: appConfig.databasePort,
  }
);

new GilmoreClothingStatelessStack(
  app,
  `${stage}-GilmoreClothingStatelessStack`,
  {
    stage,
    stageTypeName,
    table: statefulStack.table,
    env: appConfig.env,
    port: appConfig.databasePort,
    databaseCollectionName: appConfig.databaseCollectionName,
    databaseName: appConfig.databaseName,
    databaseCredentialsKey: appConfig.databaseCredentialsKey,
  }
);
