import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { errorHandler, logger } from '@shared';

import { Product } from '@dto/product';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { listProductsUseCase } from '@use-cases/list-products/list-products';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import middy from '@middy/core';

const tracer = new Tracer();
const metrics = new Metrics();

export const listProductsAdapter =
  async ({}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const products: Product[] = await listProductsUseCase();

      metrics.addMetric('SuccessfulListProduct', MetricUnit.Count, 1);

      return {
        statusCode: 200,
        body: JSON.stringify(products),
      };
    } catch (error) {
      let errorMessage = 'Unknown error';
      if (error instanceof Error) errorMessage = error.message;
      logger.error(errorMessage);

      metrics.addMetric('ListProductsError', MetricUnit.Count, 1);

      return errorHandler(error);
    }
  };

export const handler = middy(listProductsAdapter)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics));
