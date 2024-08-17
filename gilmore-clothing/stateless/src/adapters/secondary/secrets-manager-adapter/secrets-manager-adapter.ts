import axios from 'axios';
import { logger } from '@shared';

export async function getSecret<T>(secretName: string): Promise<T> {
  const extensionUrl = `http://localhost:2773/secretsmanager/get?secretId=${secretName}`;

  try {
    const response = await axios.get(extensionUrl, {
      headers: {
        'X-Aws-Parameters-Secrets-Token': process.env.AWS_SESSION_TOKEN,
      },
    });

    return JSON.parse(response.data.SecretString);
  } catch (error) {
    logger.error(`error retrieving secret: ${error}`);
    throw error;
  }
}
