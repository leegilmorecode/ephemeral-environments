import { RemovalPolicy } from 'aws-cdk-lib';
import { Stage } from 'types';

export function getStageType(stage: string): string {
  if (stage !== Stage.prod && stage !== Stage.staging && stage !== Stage.test) {
    return Stage.develop; // develop branches use a shared environment (ephemeral pr's)
  }
  return stage;
}

export function getRemovalPolicyFromStage(stage: string): RemovalPolicy {
  if (
    stage !== Stage.develop &&
    stage !== Stage.prod &&
    stage !== Stage.staging &&
    stage !== Stage.test
  ) {
    return RemovalPolicy.DESTROY; // retain our prod, develop, test, and staging stages
  }

  return RemovalPolicy.RETAIN;
}

export function getStage(stage: string): string {
  switch (stage) {
    case Stage.prod:
      return Stage.prod;
    case Stage.staging:
      return Stage.staging;
    case Stage.test:
      return Stage.test;
    default:
      return stage; // return the ephemeral environment if not known (i.e. develop)
  }
}

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
