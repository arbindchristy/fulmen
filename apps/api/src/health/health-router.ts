import { Router } from 'express';

import { healthResponseSchema, type HealthResponse } from '@fulmen/contracts';

import type { AppEnv } from '../config/env.js';

export function createHealthRouter(env: AppEnv): Router {
  const router = Router();

  router.get('/healthz', (_request, response) => {
    const payload: HealthResponse = healthResponseSchema.parse({
      status: 'ok',
      service: 'fulmen-api',
      environment: env.environment,
      version: env.appVersion,
      timestamp: new Date().toISOString(),
    });

    response.json(payload);
  });

  return router;
}
