import { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { logger, schemaValidator } from '@shared';

import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { Product } from '@dto/product';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import middy from '@middy/core';
import { schema } from '@schemas/product';
import { streamProduct } from '@use-cases/stream-product';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const tracer = new Tracer();
const metrics = new Metrics();
type StreamRecord = Record<string, AttributeValue>;

const processStreamRecord = async (record: DynamoDBRecord): Promise<void> => {
  const { dynamodb, eventName } = record;

  if (!dynamodb || !dynamodb.Keys || !dynamodb.NewImage || !eventName) {
    return;
  }

  const dynamoDBRecord = record.dynamodb;

  const product = unmarshall(
    dynamoDBRecord?.NewImage as StreamRecord
  ) as Product;

  schemaValidator(schema, product);

  await streamProduct(product);

  metrics.addMetric('SuccessfulStreamProduct', MetricUnit.Count, 1);
};

export const streamProductAdapter = async (
  event: DynamoDBStreamEvent
): Promise<void> => {
  try {
    const records: DynamoDBRecord[] = event.Records;

    const processPromises: Promise<void>[] = records.map(
      (record: DynamoDBRecord) => processStreamRecord(record)
    );

    // we map any products on the stream and push them to documentdb
    await Promise.all(processPromises);
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) errorMessage = error.message;
    logger.error(errorMessage);

    metrics.addMetric('StreamProductError', MetricUnit.Count, 1);

    throw error;
  }
};

export const handler = middy(streamProductAdapter)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics));
