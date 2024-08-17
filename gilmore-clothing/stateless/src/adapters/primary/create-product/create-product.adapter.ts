import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateProduct, Product } from '@dto/product';
import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { errorHandler, logger, schemaValidator } from '@shared';

import { Tracer } from '@aws-lambda-powertools/tracer';
import { ValidationError } from '@errors/validation-error';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { createProductUseCase } from '@use-cases/create-product';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import middy from '@middy/core';
import { schema } from './create-product.schema';

const tracer = new Tracer();
const metrics = new Metrics();

export const createProductAdapter = async ({
  body,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!body) throw new ValidationError('no payload body');

    const product = JSON.parse(body) as CreateProduct;

    schemaValidator(schema, product);

    const created: Product = await createProductUseCase(product);

    metrics.addMetric('SuccessfulCreateProduct', MetricUnit.Count, 1);

    return {
      statusCode: 201,
      body: JSON.stringify(created),
    };
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) errorMessage = error.message;
    logger.error(errorMessage);

    metrics.addMetric('CreateProductError', MetricUnit.Count, 1);

    return errorHandler(error);
  }
};

export const handler = middy(createProductAdapter)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics));
