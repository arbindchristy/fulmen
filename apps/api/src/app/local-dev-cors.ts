import type { RequestHandler } from 'express';

const localDevAllowedHeaders = ['content-type', 'x-fulmen-role'] as const;

export function createLocalDevCorsMiddleware(webOrigin: string): RequestHandler {
  return (request, response, next) => {
    const origin = request.header('origin');

    if (origin === webOrigin) {
      response.header('Access-Control-Allow-Origin', webOrigin);
      response.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      response.header(
        'Access-Control-Allow-Headers',
        localDevAllowedHeaders.join(','),
      );
      response.header('Vary', 'Origin');
    }

    if (request.method === 'OPTIONS' && origin === webOrigin) {
      response.sendStatus(204);
      return;
    }

    next();
  };
}
